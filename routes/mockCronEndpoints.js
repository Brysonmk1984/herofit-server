const express = require('express');
const router = express.Router(); 
const Avatar = require('../db').Avatar;
const Battle = require('../db').Battle;
const db = require('../db').db;
const { Op, literal, col, fn, QueryTypes } = require("sequelize");
const sequelize = require("sequelize");
const { sendAppErrorEmail, sendBattleReportEmail } = require('../mail');
const { cloneObj, parseAvatarProperties, arrayChunker } = require('../helperFunctions');
const { REVIVE_AMOUNT, KO_RECOVERY_RETARDER, RESTED_THRESHOLD, REGENERATION_RATE, BATTLE_SCENARIOS, OUTCOME_XP, FOE_DIFFICULTY_XP_MOD_FACTOR, FOE_NON_ACTION, AVATAR_NON_ACTION } = require('../game/constants');
const { selectFoeTemplate, generateFoeStats } = require('../game/foeFunctions');
const doScenarioAndBonus = require('../game/doScenarioAndBonus');
const { doAvatarBattlePrep, doFoeBattlePrep } = require('../game/doBattlePrep');
const doBattle = require('../game/doBattle');
const xpCalc = require('../game/upgrades/xpCalc');
const { doPostBattleActions, determinePostBattleActions } = require('../game/postBattleActions');
// { where: { health: { [Op.lt]: db.col('maxHealth') } }


// FORCE A CYCLE OF HEALTH REGEN FOR ALL ALLIES
router.get('/regenerate-health', async function(req, res, next){
    
  //Get all avatars who aren't at full health
  return Avatar.findAll(
    { where: { status: 'Recovering' }, raw: true, attributes: ['health','maxHealth','recovery','status', 'owner'] },
  ).then((results) => {
    
    const allPromises = []
    
    // Loop over each Recovering Avatar and add up to default regen + avatar's regen to health
    results.forEach((result) =>{
    result = parseAvatarProperties(result);

      let h = result.health;
      const mH = result.maxHealth;
      const adjRegenRate = REGENERATION_RATE + result.recovery;
    
      if((h + adjRegenRate) > mH){
        result.health = mH;
      }else{
        result.health += adjRegenRate;
      }
      // Update status if over 'Rested' threshold
      let updatedStatus = 'Recovering';
      if((result.health / mH) >= RESTED_THRESHOLD){
        updatedStatus = 'Rested';
      }


      allPromises.push(Avatar.update(
        {health : result.health, status : updatedStatus},
        { where: { owner: result.owner },
        returning: true,
        raw: true, 
        plain: true
      }));
    });
    return Promise.allSettled(allPromises);

  }).then((results) => {
    return results.forEach((result) => console.log('All Regenerate Results - ', result.status));
  }).catch((error) =>{
    console.log('ERROR DOING BULK HEALTH UPDATE', error);
    return new Promise((resolve, reject) =>{
      return sendAppErrorEmail({ message : error.message, name : error.name , errorLocation : "Back End"},resolve, reject)
    }).catch((error) =>{
      console.log('couldn\'t send error email for error - ', error);
      res.status(400).json({
        status:400,
        eInside : error
      });
      next();
    });
  });
});


// FORCE A CYCLE OF KO RECOVERY CHECK FOR KOED AVATARS
router.get('/try-recovery', function(req, res, next){
  // Get all avatars who are KOed
  return Avatar.findAll(
    { where: { status: "Knocked Out" }, raw: true, attributes: ['health', 'recovery','status', 'owner'] },
  ).then((results) => {console.log('all KO results', results);
    const recoveredAvatars = []
    
    if(results.length){
      // Loop over each Recovering Avatar and add up to default regen + avatar's regen to health
      results.forEach((result, i) =>{
        result = parseAvatarProperties(result);
        const recoveryChance = result.recovery >= 100 ? 100 : result.recovery;

        // THESE ARE THE NUMBERS THAT IF MATCHED IN THE WHILE LOOP, WILL ALLOW AVATAR TO RECOVER EARLY
        const recoveryWinners = [];
        for(let i = 0; i < recoveryChance; i++){
          recoveryWinners.push(Math.floor(Math.random() * 100));
        }
        const winningNum = Math.floor(Math.random() * 100);
        const found = recoveryWinners.includes(winningNum);
        
        // Need to restrict how effective KO recovery is
        let winnerRetarder = false;
        if(Math.random() < KO_RECOVERY_RETARDER){
          winnerRetarder = true;
        }

        // Revive avatar to the REVIVE_AMOUNT in constants.js
        if(winnerRetarder && found){
          console.log('Found & Recovering!', result.owner);
          return recoveredAvatars.push(result.owner);
        }
        return null;

      });
      console.log('recovered avs', recoveredAvatars);
      return Avatar.update(
        { health : REVIVE_AMOUNT, status : 'Recovering' },
        { where: { owner: { [Op.in]: recoveredAvatars } }}
      );
    }else{
      console.log('No Avs to Recover');
      res.status(200);
      next();
    }
  }).then(()=>{
    console.log('SHOULD HAVE ATTEMPTED KO RECOVERY');
    res.status(200);
    next();
  }).catch((error) =>{
      console.log('ERROR TRYING TO DO KO REVIVES', error);
    return new Promise((resolve, reject) =>{
      return sendAppErrorEmail({ message : error.message, status : error.status, debug : error.debug },resolve, reject)
    });
  });
});




// RANDOMLY GENERATE A FOE
router.post('/generate-foe', function(req, res, next){
  const foe = generateFoeStats(req.body.avatar);
  res.status(200).json({
    foe
  });
});


// SIMULATE 100 BATTLES FOR EACH OF THE 6 SCENARIOS
router.post('/do-battle-sims', function(req, res, next){
  // overall Tally of results
  const tally = {};

  // FOR EACH OF THE 6 SCENARIOS, DO 100 BATTLES
  BATTLE_SCENARIOS.forEach((SCENARIO) =>{
    
  tally[SCENARIO.id] = {
    fw : 0,
    aw : 0,
    d : 0,
    dk : 0
  };

  // SIMULATING 100 BATTLES
  for(let i=0;i<100;i++){
    // BATTLE STEP 1 - PLAYER DECIDES TO GO TO BATTLE (happends earlier when a user clicks 'Battle')
    
    let avatar = req.body.avatar;
    const itemsUsed = req.body.itemsUsed;
    const actionsChosen = req.body.actionsChosen;
    let foeWithStats = generateFoeStats(avatar);

    // // BATTLE STEP 2 - ENCOUNTER SCENARIO IS DECIDED AND BONUSES GIVEN
    const { scenario, sAvatar, sFoe  } = doScenarioAndBonus(cloneObj(avatar), cloneObj(foeWithStats), SCENARIO.id);

    // avatar and foe to be used for battle
    let BRA = Object.assign({}, sAvatar);
    let BRF = Object.assign({}, sFoe);

    // BATTLE STEP 3 - PLAYER USES ITEMS AND CHOOSED ACTIONS
    if(itemsUsed || actionsChosen){
      if(scenario.id !== AVATAR_NON_ACTION){
        BRA = doAvatarBattlePrep(BRA, BRF, itemsUsed, actionsChosen);
      }
    }

    // BATTLE STEP 4 - FOE USES ITEMS AND CHOOSED ACTIONS
    if(foeWithStats.ability){
      if(scenario.id !== FOE_NON_ACTION){
        const foeBP = doFoeBattlePrep(BRF, BRA, null, foeWithStats.ability);
        BRF = foeBP.foe;
        BRA = foeBP.avatar;
      }
    }

    // BATTLE STEP 5 - EXCHANGE DAMAGE
    const battleResults = doBattle(BRA, BRF);

      if(battleResults.outcomeData.outcome === "Foe Wins"){
        tally[SCENARIO.id].fw++;
      }else if(battleResults.outcomeData.outcome === "Avatar Wins"){
        tally[SCENARIO.id].aw++;
      }else if(battleResults.outcomeData.outcome === "Draw"){
        tally[SCENARIO.id].d++;
      }else if(battleResults.outcomeData.outcome === "Double KO"){
        tally[SCENARIO.id].dk++;
      }

    const awins = tally[SCENARIO.id].aw;
    const fwins = tally[SCENARIO.id].fw;
    const aAndfwins = tally[SCENARIO.id].aw + tally[SCENARIO.id].fw;
    const all = tally[SCENARIO.id].aw + tally[SCENARIO.id].fw + tally[SCENARIO.id].d + tally[SCENARIO.id].dk;
    const aAverage = awins / aAndfwins || 0;
    const aAverageOverall = awins / all || 0;
    const fAverage = fwins / aAndfwins || 0;
    const fAverageOverall = fwins / all || 0;
    const dAverage = tally[SCENARIO.id].d / all || 0;
    const dKAverage = tally[SCENARIO.id].dk / all || 0;

      tally[SCENARIO.id].averages = {
        'AVATAR WINS VS FOE' : (parseFloat(aAverage) * 100).toFixed(1) +`%`,
        'AVATAR WINS OVERALL' : (parseFloat(aAverageOverall) * 100).toFixed(1) +`%`,
        'FOE WINS VS AVATAR' : (parseFloat(fAverage) * 100).toFixed(1) +`%`,
        'FOE WINS OVERALL' : (parseFloat(fAverageOverall) * 100).toFixed(1) +`%`,
        'DRAW' : (parseFloat(dAverage) * 100).toFixed(1) +`%`,
        'DOUBLE KO' : (parseFloat(dKAverage) * 100).toFixed(1) +`%`,
      }
      tally[SCENARIO.id].scenario = scenario;
  }
  });

  // BATTLE STEP 6 - END COMBAT, APPLY ANY POST BATTLE MECHANICS HERE
  res.status(200).json({
    tally,
  });
});


// DO A SINGLE INSTANCE OF BATTLE with passed in Avatar
router.post('/do-battle', function(req, res, next){
  const avatarID = req.body.avatarID;
  let battleID;
  let avatar;
  let foe;

  Battle.findAll({
    limit: 1,
    where: { avatarID },
    order: [ [ 'createdAt', 'DESC' ]],
    raw : true
  }).then((battle) =>{
    battle = battle[0];
    foe = battle.foe;
    battleID = battle.id;
    //console.log('THEBATTLE - ', battle);

    return Avatar.findOne(
      { where : { id : avatarID }, raw : true, attributes: ['name','character','health','power','armor','fire','air','water','earth','status', 'activityXP', 'battleXP', 'battleWins','battleLosses','battleDraws', 'battleDkos'] }
    )
  }).then((av)=>{
    // BATTLE STEP 1 - PLAYER DECIDES TO GO TO BATTLE (happends earlier when a user clicks 'Battle')

    // Non-Whole numbers come out of DB as strings, so need to convert to numbers here
    avatar = parseAvatarProperties(av);
    
    const itemsUsed = req.body.itemsUsed;
    const actionsChosen = req.body.actionsChosen;

    const foeWithStats = Object.assign({}, foe, generateFoeStats(avatar));

    // BATTLE STEP 2 - ENCOUNTER SCENARIO IS DECIDED AND BONUSES GIVEN
    const { scenario, sAvatar, sFoe  } = doScenarioAndBonus(cloneObj(avatar), cloneObj(foeWithStats));
    
    // avatar and foe to be used for battle
    let BRA = Object.assign({}, sAvatar);
    let BRF = Object.assign({}, sFoe);
    
    // BATTLE STEP 3 - PLAYER USES ITEMS AND CHOOSED ACTIONS
    
    if(itemsUsed || actionsChosen){
      if(scenario.id !== AVATAR_NON_ACTION){
        const avBP = doAvatarBattlePrep(BRA, BRF, itemsUsed, actionsChosen);
        BRA = avBP.avatar;
        BRF = avBP.foe;
      }
    }

    // BATTLE STEP 4 - FOE USES ITEMS AND CHOOSED ACTIONS
    if(foeWithStats.ability){
      if(scenario.id !== FOE_NON_ACTION){
        const foeBP = doFoeBattlePrep(BRF, BRA, null, foeWithStats.ability);
        BRF = foeBP.foe;
        BRA = foeBP.avatar;
      }
    }

    // BATTLE STEP 5 - EXCHANGE DAMAGE
    const battleResults = doBattle(BRA, BRF);

    // SAVE DATA

    const b = battleResults;
    let xpGain;

    switch(b.outcomeData.outcome){
      case "Avatar Wins":
        xpGain = OUTCOME_XP.win;
        avatar.battleWins = avatar.battleWins + 1;
        break;
      case "Foe Wins":
        xpGain = OUTCOME_XP.loss;
        avatar.battlelosses = avatar.battlelosses + 1;
        break;
      case "Draw":
        xpGain = OUTCOME_XP.draw;
        avatar.battleDraws = avatar.battleDraws + 1;
        break;
      case "Double KO":
        xpGain = OUTCOME_XP.dko;
        avatar.battleDkos = avatar.battleDkos + 1;
        break;
      default:
    }

    // SAVE RESULTS TO DB
    return Battle.update({
      scenario : scenario.id,
      outcome : b.outcomeData.outcome,
      aStatus : b.outcomeData.avatarStatus,
      aPhyDamage : b.aPhyDamage,
      fPhyReduction : b.fPhyReduction,
      fPhyDamage : b.fPhyDamage,
      aPhyReduction : b.aPhyReduction,
      xpGain,
      aHealthRemaining : b.aHealthRemaining,
      fHealthRemaining : b.fHealthRemaining,
      foe : Object.assign({}, foe, foeWithStats),
      avatar : avatar,
      bra : BRA,
      brf : BRF,
      aElmDamage : b.aElmDamage,
      fElmReduction : b.fElmReduction,
      fElmDamage : b.fElmDamage,
      aElmReduction : b.aElmReduction,
    },
    { where: { id: battleID }, raw : true })
    .then(() => {
    const limitedAHealthRemaining = b.aHealthRemaining < 0 ? 0 : b.aHealthRemaining;

    avatar.status = b.outcomeData.avatarStatus;
    avatar.battleXP = avatar.battleXP + xpGain;

    return Avatar.update(
      { goToBattle : false, health : limitedAHealthRemaining, status : avatar.status, battleXP : avatar.battleXP, battleWins : avatar.battleWins, battleLosses : avatar.battleLosses, battleDraws :  avatar.battleDraws, battleDkos : avatar.battleDkos},
      { where: { id: avatarID } });
  }).then((result) =>{
    //console.log('finished updating avatar', avatar);
    return res.status(200).json({
      avatar,
      foe : Object.assign({}, foe, foeWithStats),
      BRA,
      BRF,
      scenario,
      battleResults,
      xpGain
    });
  }).catch((error) =>{
    //console.log('ERROR SOMEWHERE IN BATTLE PROCESS - ', error);
    res.status(400).json({
      message : `ERROR SOMEWHERE IN BATTLE PROCESS- ${error}`,
    });
    next();
  });
  });
});



// DO ALL BATTLES WHERE BATTLE OUTCOME IS TBD
router.get('/do-all-battles', function(req, res, next){
  
  let allBattleIds = [];
  let allAvatarIds = [];
  let allAvatarPromises = [];
  let allFoes = [];
  let allBattlePromises = [];
  let avatarUpdates = {};
  // Breaking battles into groups of 20 so updating doesn't break
  let battleShards = [];

 const tally= {
    foeWins : 0,
    avatarWins : 0,
    draw : 0,
    doubleKO : 0,
    total : 0,
    avWinPercent : 0,
    avWinPercentOverall : 0,
    tiePercent : 0
  };

  function runBattlesOnBatch(shard, shardIndex){
    console.log('ShardIndex - ', shardIndex);
    allBattleIds = [];
    allAvatarIds = [];
    allFoes = [];
    allPostBattleActions = [];
    allAvatarPromises = [];

    shard.forEach((battle) =>{
      console.log('BID - ', battle.id);
      //console.log('into arrays - ', battle.id, battle.avatarID, battle.foe);
      allBattleIds.push(battle.id);
      allAvatarIds.push(battle.avatarID);
      allFoes.push(battle.foe);
      allPostBattleActions.push(battle.postBattleActions);
      //console.log('BATTLE - ',battle);
      allAvatarPromises.push(Avatar.findOne(
        { where : { id: battle.avatarID }, raw : true, attributes: ['id','name','character', 'qp', 'health','power','armor','fire','air','water','earth','status', 'activityXP', 'battleXP', 'battleWins','battleLosses','battleDraws', 'battleDkos'] }
      ));
    });

    return Promise.allSettled(allAvatarPromises)

    .then((results) =>{
      const avatars = results.map((result) => result.value);

      //console.log('AV LENGTH - ', avatars.length);
      //console.log('AVS - ', avatars);
      avatars.forEach((avatar, i) =>{
        // BATTLE STEP 1 - PLAYER DECIDES TO GO TO BATTLE (happends earlier when a user clicks 'Battle')

        // Non-Whole numbers come out of DB as strings, so need to convert to numbers here
        avatar = parseAvatarProperties(avatar);

        const itemsUsed = req.body.itemsUsed || null;
        const actionsChosen = req.body.actionsChosen || null;

        const foeWithStats = allFoes[i];
        // BATTLE STEP 2 - ENCOUNTER SCENARIO IS DECIDED AND BONUSES GIVEN
        const { scenario, sAvatar, sFoe  } = doScenarioAndBonus(cloneObj(avatar), cloneObj(foeWithStats));
        
        // avatar and foe to be used for battle
        let BRA = Object.assign({}, sAvatar);
        let BRF = Object.assign({}, sFoe);

        // Need level to figure out xp gain from wins after battle
        const { currentLevelByInput } = xpCalc();
        BRA.level = currentLevelByInput(avatar.activityXP + avatar.battleXP);


        // BATTLE STEP 3 - PLAYER USES ITEMS AND CHOOSED ACTIONS
        
        if(itemsUsed || actionsChosen){
          if(scenario.id !== AVATAR_NON_ACTION){
            const avBP = doAvatarBattlePrep(BRA, BRF, itemsUsed, actionsChosen);
            BRA = avBP.avatar;
            BRF = avBP.foe;
          }
        }

        // BATTLE STEP 4 - FOE USES ITEMS AND CHOOSED ACTIONS
        if(foeWithStats.ability){
          if(scenario.id !== FOE_NON_ACTION){
            const foeBP = doFoeBattlePrep(BRF, BRA, null, foeWithStats.ability);
            BRF = foeBP.foe;
            BRA = foeBP.avatar;
          }
        }

        // WHO SWINGS FIRST
        let goesFirst;
        if(scenario.id === 0){
          goesFirst = 'Avatar';
        }else if(scenario.id === 3){
          goesFirst = 'Foe';
        }else{
          const randDecider = Math.floor(Math.random() * 2);
          goesFirst = randDecider === 0 ? 'Avatar' : 'Foe';
        }

        // BATTLE STEP 5 - EXCHANGE DAMAGE
        const b = doBattle(BRA, BRF, goesFirst);

        // SAVE DATA
        let xpGain, ptGain;
        
        console.log('OUTCOME - ', b.outcomeData.outcome);
        //BRF.bonusXP = 50;
        //BRF.bonusPT = 50;
        
        // POST BATTLE ACTIONS
        const postBattleActions = allPostBattleActions[i] || [];
        
        switch(b.outcomeData.outcome){
          case "Avatar Wins":
            xpGain = BRF.xpBounty; 
            ptGain = BRF.xpBounty; 
            avatar.battleWins = avatar.battleWins + 1;
            
            const actionsForWin = postBattleActions.filter(action => action.battleOutcome === 'win' || action.battleOutcome === 'any');
            doPostBattleActions(actionsForWin);

            // for email tally
            tally.avatarWins += 1;
            break;
          case "Foe Wins":
            xpGain = BRF.xpBounty * OUTCOME.lossMultiplier;
            avatar.battleLosses = avatar.battleLosses + 1;
            
            const actionsForLoss = postBattleActions.filter(action => action.battleOutcome === 'loss' || action.battleOutcome === 'any');
            doPostBattleActions(actionsForLoss);

            // for email tally
            tally.foeWins += 1;
            break;
          case "Draw":
            xpGain = BRF.xpBounty * OUTCOME.drawMultiplier;
            avatar.battleDraws = avatar.battleDraws + 1;
            
            const actionsForDraw = postBattleActions.filter(action => action.battleOutcome === 'draw' || action.battleOutcome === 'any');
            doPostBattleActions(actionsForDraw);

            // for email tally
            tally.draw += 1;
            break;
          case "Double KO":
            xpGain = BRF.xpBounty * OUTCOME.dkoMultiplier;
            avatar.battleDkos = avatar.battleDkos + 1;
            
            const actionsForDko = postBattleActions.filter(action => action.battleOutcome === 'dko' || action.battleOutcome === 'any');
            doPostBattleActions(actionsForDko);

            // for email tally
            tally.doubleKO += 1;
            break;
          default:
        }
        
        console.log('XPgain - ', xpGain, 'PTgain', ptGain);




        
        
        // Check for lvl up
        const { checkLevelUp } = xpCalc(avatar.activityXP, avatar.battleXP);
        const { leveledUp, qpEarned } = checkLevelUp(xpGain);
        //console.log('LEVELED UP - ', leveledUp, 'QP EARNED - ', qpEarned);
        console.log('BATTLE[i] - ', allBattleIds[i] );
        console.log('AV ID - ', avatar.id, avatar.name );
        allBattlePromises.push(Battle.update({
          scenario : scenario.id,
          outcome : b.outcomeData.outcome,
          aStatus : b.outcomeData.avatarStatus,
          aPhyDamage : b.aPhyDamage,
          fPhyReduction : b.fPhyReduction,
          fPhyDamage : b.fPhyDamage,
          aPhyReduction : b.aPhyReduction,
          xpGain,
          leveledUp : leveledUp,
          aHealthRemaining : b.aHealthRemaining,
          fHealthRemaining : b.fHealthRemaining,
          foe : Object.assign({}, allFoes[i], foeWithStats),
          avatar : avatar,
          bra : BRA,
          brf : BRF,
          aElmDamage : b.aElmDamage,
          fElmReduction : b.fElmReduction,
          fElmDamage : b.fElmDamage,
          aElmReduction : b.aElmReduction,
          roundBreakdown : b.roundBreakdown
        },
        { where: { id: allBattleIds[i] }, raw : true }
        ));
        const limitedAHealthRemaining = b.aHealthRemaining < 0 ? 0 : b.aHealthRemaining;
        avatar.status = b.outcomeData.avatarStatus;
        avatar.battleXP = avatar.battleXP + xpGain;
        avatar.qp += qpEarned;

        avatarUpdates[avatar.id] = { goToBattle : false, qp : avatar.qp, health : limitedAHealthRemaining, status : avatar.status, battleXP : avatar.battleXP, battleWins : avatar.battleWins, battleLosses : avatar.battleLosses, battleDraws :  avatar.battleDraws, battleDkos : avatar.battleDkos};
        // End Avatar for each
      });

      return Promise.allSettled(allBattlePromises);
    }).then(() => {
      console.log('UPDATED ALL BATTLES');
      
      const allUpdateAvatarPromises = [];
      allAvatarIds.forEach((avatarId, i) =>{
        //console.log('this will update - ');
        //console.log('alpaca ID and update - ',avatarId, avatarUpdates[avatarId]);

        allUpdateAvatarPromises.push(Avatar.update(avatarUpdates[avatarId],{ where: { id: avatarId } }));
      });

      return Promise.allSettled(allUpdateAvatarPromises);
      
    });
  }
  // END RUN  BATTLES ON BATCH


  // GET ALL TBD BATTLES
  Battle.findAll({
    where: { outcome : 'TBD' },
    raw : true
  // BREAK BATTLES INTO SHARDS, THEN runBattlesOnBatch ON ALL SHARDS
  }).then((battles) =>{
    console.log('BATTLECOUNT - ', battles.length);
    // Need to divide records into groups of 15
    battleShards = arrayChunker(battles, 15);
    console.log('BattleShard length = ', battleShards.length);
    
    return Promise.allSettled(battleShards.map(async (shard, i) => {
      console.log('I - ', i);
      // Update one batch every 8 seconds
      const timeoutDuration = i * 2000;
      // RUN BATTLES ON BATCH
      return await new Promise((resolve) =>{
        //resolve(runBattlesOnBatch(shard));
        setTimeout(() => {
          resolve(runBattlesOnBatch(shard, i));
        }, timeoutDuration);
      });
    }));

  // TALLY UP THE RESULTS AND SEND EMAIL
  }).then(() => {
      console.log('ALL AVATARS UPDATED');
      tally.total = tally.foeWins + tally.avatarWins + tally.draw + tally.doubleKO;
      tally.avWinPercent = Math.floor(tally.avatarWins / (tally.foeWins + tally.avatarWins)) || 0;
      tally.avWinPercentOverall = Math.floor(tally.avatarWins / tally.total) || 0;
      tally.tiePercent = Math.floor((tally.draw + tally.doubleKO) / tally.total) || 0;
      console.log('tally', tally, 'updates', avatarUpdates);

      return sendBattleReportEmail(tally);
  }).then((data) =>{
    console.log('Result Tally email sent successfully',data);
  }).catch((error)=>{
    console.log('error in cronBattleHour', error);
  });

  
});

// MOCK ENDPOINT for triggering PBAs
router.get('/mock-do-pbas', function(req, res, next){

  const avatar = {
    "id": "254",
    "qp": 43,
    "air": 43.5,
    "fire": 20.86,
    "name": "Grabbler",
    "armor": 30,
    "earth": 112.47,
    "power": 251,
    "water": 2,
    "health": 180,
    "status": "Recovering",
    "battleXP": 1242,
    "character": "Boulder Bro",
    "activityXP": 4554,
    "battleDkos": 6,
    "battleWins": 36,
    "battleDraws": 2,
    "battleLosses": 13
};

  const foe = {
    "id": 2,
    "class":"Spirits",
    "air": 0,
    "fire": 0,
    "name": "Shadow-Grabbler",
    "type": "Shadow-Self",
    "armor": 33,
    "earth": 0,
    "power": 232,
    "water": 0,
    "health": 196,
    "ability": {
        "name": "Armor Barter",
        "effect": "Armor Trade"
    },
    "difficulty": -0.057
  };

  new Promise((resolve, reject) =>{
    return determinePostBattleActions(avatar, foe, resolve, reject);
  }).then((PBAs) =>{
    console.log('IN THEN OF MOCK ENDPOINT');
    console.log('PBA-s - ', PBAs);
  }).catch((err)=>{
    console.log('ERROR DETERMINING PBAs - ', err);
  });
});

module.exports = router;