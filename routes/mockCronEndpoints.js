const express = require('express');
const router = express.Router(); 
const Avatar = require('../db').Avatar;
const Battle = require('../db').Battle;
const db = require('../db').db;
const { Op, literal, col, fn, QueryTypes } = require("sequelize");
const sequelize = require("sequelize");
const { sendAppErrorEmail, sendBattleReportEmail } = require('../mail');
const { cloneObj, parseAvatarProperties } = require('../helperFunctions');
const { REVIVE_AMOUNT, RESTED_THRESHOLD, REGENERATION_RATE, BATTLE_SCENARIOS, OUTCOME_XP, FOE_NON_ACTION, AVATAR_NON_ACTION } = require('../game/constants');
const { selectFoeTemplate, generateFoeStats } = require('../game/foeFunctions');
const doScenarioAndBonus = require('../game/doScenarioAndBonus');
const { doAvatarBattlePrep, doFoeBattlePrep } = require('../game/doBattlePrep');
const doBattle = require('../game/doBattle');

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
    console.log(results.length);
    return results.forEach((result) => console.log('All Regenerate Results - ', result.status))
  }).catch((error) =>{
    console.log('ERROR DOING BULK HEALTH UPDATE', error);
    return new Promise((resolve, reject) =>{
      return sendAppErrorEmail({ message : error.message, name : error.name },resolve, reject)
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
  ).then((results) => {

    const recoveredAvatars = []

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
      
      // Revive avatar to the REVIVE_AMOUNT in constants.js
      if(found){
        return recoveredAvatars.push(result.owner);
      }
      return null;

    });
    return Avatar.update(
      { health : REVIVE_AMOUNT, status : 'Recovering' },
      { where: { owner: { [Op.in]: recoveredAvatars } }}
    ).then(()=>{
      res.status(200);
    }).catch((error)=>{
      console.log('ERROR', error);
      res.status(400);
    });

  }).catch((error) =>{
      console.log('THEE ERROR', error);
    return new Promise((resolve, reject) =>{
      return sendAppErrorEmail({ message : error.message, status : error.status, debug : error.debug },resolve, reject)
    }).catch((error) =>{
      console.log('couldn\'t send error email for error - ', error);
      res.status(400);
      next();
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



// DO A SINGLE INSTANCE OF BATTLE with passed in Avatar
router.post('/do-battle-mock', function(req, res, next){
  // BATTLE STEP 1 - PLAYER DECIDES TO GO TO BATTLE (happends earlier when a user clicks 'Battle')
  let avatar = req.body.avatar;
 
  const itemsUsed = req.body.itemsUsed;
  const actionsChosen = req.body.actionsChosen;
  let foe = generateFoeStats(avatar);

  // BATTLE STEP 2 - ENCOUNTER SCENARIO IS DECIDED AND BONUSES GIVEN
  const { scenario, sAvatar, sFoe  } = doScenarioAndBonus(cloneObj(avatar), cloneObj(foe));
  
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
  if(false){
    if(scenario.id !== FOE_NON_ACTION){
      BRF = doFoeBattlePrep(BRA, BRF, itemsUsed, actionsChosen);
    }
  }

  // BATTLE STEP 5 - EXCHANGE DAMAGE
  const battleResults = doBattle(BRA, BRF);
  const b = battleResults;
  let xpGain;

  switch(battleResults.outcomeData.outcome){
    case "Avatar Wins":
      xpGain = OUTCOME_XP.win;
      break;
    case "Foe Wins":
      xpGain = OUTCOME_XP.loss;
      break;
    case "Draw":
      xpGain = OUTCOME_XP.draw;
      break;
    case "Double KO":
      xpGain = OUTCOME_XP.dko;
      break;
    default:
  }
  
  // SAVE RESULTS TO DB
  Battle.update({
    outcome : b.outcomeData.outcome,
    aStatus : b.avatarStatus,
    aPhyDamage : b.aPhyDamage,
    fPhyReduction : b.fPhyReduction,
    fPhyDamage : b.fPhyDamage,
    aPhyReduction : b.aPhyReduction,
    xpGain,
    aHealthRemaining : b.aHealthRemaining,
    fHealthRemaining : b.fHealthRemaining,
    foe,
    bra : BRA,
    brf : BRF,
    aElmDamage : b.aElmDamage,
    fElmReduction : b.fElmReduction,
    fElmDamage : b.fElmDamage,
    aElmReduction : b.aElmReduction,
  },
  { where: { id: battleId } }
).then((battles) => {
  // Avatar.update(
  //   {health : result.health},
  //   { where: { owner: result.owner } }
  // )
}).catch((error) =>{
  console.log('INDIVIDUAL BATTLE ERROR - ', error);
});

  // BATTLE STEP 6 - END COMBAT, APPLY ANY POST BATTLE MECHANICS HERE
  res.status(200).json({
    avatar,
    //avatarPrep,
    BRA,
    BRF,
    //foePrep,
    scenario,
    battleResults,
    xpGain
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
    let foe = generateFoeStats(avatar);
  
    // // BATTLE STEP 2 - ENCOUNTER SCENARIO IS DECIDED AND BONUSES GIVEN
    const { scenario, sAvatar, sFoe  } = doScenarioAndBonus(cloneObj(avatar), cloneObj(foe), SCENARIO.id);

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
    if(false){
      if(scenario.id !== FOE_NON_ACTION){
        BRF = doFoeBattlePrep(BRA, BRF, itemsUsed, actionsChosen);
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
    tally
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
    console.log('THEBATTLE - ', battle);

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
    console.log('finished updating avatar', avatar);
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
    console.log('ERROR SOMEWHERE IN BATTLE PROCESS - ', error);
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
  let avatarUpdates = [];
  //let allUpdateAvatarPromises = [];

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


  Battle.findAll({
    where: { outcome : 'TBD' },
    raw : true
  }).then((battles) =>{
    console.log('BATTLES!', battles);
    battles.forEach((battle) =>{
      allBattleIds.push(battle.id);
      allAvatarIds.push(battle.avatarID);
      allFoes.push(battle.foe);
      
      allAvatarPromises.push(Avatar.findOne(
        { where : { id: { [Op.in]: allAvatarIds }}, raw : true, attributes: ['name','character','health','power','armor','fire','air','water','earth','status', 'activityXP', 'battleXP', 'battleWins','battleLosses','battleDraws', 'battleDkos'] }
      ));
    })

    return Promise.all(allAvatarPromises);

  }).then((avatars) =>{

    avatars.forEach((avatar, i) =>{
      // BATTLE STEP 1 - PLAYER DECIDES TO GO TO BATTLE (happends earlier when a user clicks 'Battle')

      // Non-Whole numbers come out of DB as strings, so need to convert to numbers here
      avatar = parseAvatarProperties(avatar);

      const itemsUsed = req.body.itemsUsed || null;
      const actionsChosen = req.body.actionsChosen || null;
      console.log(allFoes[i]);
      const foeWithStats = Object.assign({}, allFoes[i], generateFoeStats(avatar));
      console.log(foeWithStats);
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
          // for email tally
          tally.avatarWins += 1;
          break;
        case "Foe Wins":
          xpGain = OUTCOME_XP.loss;
          avatar.battleLosses = avatar.battleLosses + 1;
          // for email tally
          tally.foeWins += 1;
          break;
        case "Draw":
          xpGain = OUTCOME_XP.draw;
          avatar.battleDraws = avatar.battleDraws + 1;
          // for email tally
          tally.draw += 1;
          break;
        case "Double KO":
          xpGain = OUTCOME_XP.dko;
          avatar.battleDkos = avatar.battleDkos + 1;
          // for email tally
          tally.doubleKO += 1;
          break;
        default:
      }
      

      allBattlePromises.push(Battle.update({
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
        foe : Object.assign({}, allFoes[i], foeWithStats),
        avatar : avatar,
        bra : BRA,
        brf : BRF,
        aElmDamage : b.aElmDamage,
        fElmReduction : b.fElmReduction,
        fElmDamage : b.fElmDamage,
        aElmReduction : b.aElmReduction,
      },
      { where: { id: allBattleIds[i] }, raw : true }
      ));
      const limitedAHealthRemaining = b.aHealthRemaining < 0 ? 0 : b.aHealthRemaining;
      avatar.status = b.outcomeData.avatarStatus;
      avatar.battleXP = avatar.battleXP + xpGain;

      avatarUpdates.push({ goToBattle : false, health : limitedAHealthRemaining, status : avatar.status, battleXP : avatar.battleXP, battleWins : avatar.battleWins, battleLosses : avatar.battleLosses, battleDraws :  avatar.battleDraws, battleDkos : avatar.battleDkos});
      // End Avatar for each
    });

    return Promise.all(allBattlePromises);
  }).then(() => {
    console.log('UPDATED ALL BATTLES');
    
    const allUpdateAvatarPromises = [];
    allAvatarIds.forEach((avatarId, i) =>{
      allUpdateAvatarPromises.push(Avatar.update(avatarUpdates[i],{ where: { id: avatarId } }));
    });

    return Promise.all(allUpdateAvatarPromises);
    
  }).then(() => {
    console.log('ALL AVATARS UPDATED');
    tally.total = tally.foeWins + tally.avatarWins + tally.draw + tally.doubleKO;
    tally.avWinPercent = Math.floor(tally.avatarWins / (tally.foeWins + tally.avatarWins)) || 0;
    tally.avWinPercentOverall = Math.floor(tally.avatarWins / tally.total) || 0;
    tally.tiePercent = Math.floor((tally.draw + tally.doubleKO) / tally.total) || 0;
    console.log('tally', tally);
    return new Promise((resolve, reject) =>{
      return sendBattleReportEmail(tally, resolve, reject);
    });
  }).then((data) =>{
    console.log('Result Tally email sent successfully',data);
  }).catch((error)=>{
    console.log('error in cronBattleHour', error);
  });

  
});


module.exports = router;