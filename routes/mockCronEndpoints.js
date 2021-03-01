const express = require('express');
const router = express.Router(); 
const Avatar = require('../db').Avatar;
const AvatarEquip = require('../db').AvatarEquip;
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
const { doAllPbas } = require('../game/runPostBattleActions');
const { determinePostBattleActions } = require('../game/onGoToBattle');
const ALLPBAs = require('../game/postBattleActions.json');
const ALLITEMS = require('../game/allItems.json');
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

// MOCK ENDPOINT for DETERMINING PBAs
router.get('/mock-determine-pbas', function(req, res, next){

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
    res.status(200).json({
      postBattleActions : PBAs
    });
  }).catch((err)=>{
    console.log('ERROR DETERMINING PBAs - ', err);
  });
});

// MOCK ENDPOINT for RUNNING PBAs
router.post('/mock-run-pbas', function(req, res, next){
  let battleId = req.body.id;

  if(battleId){
    // only meant to grab latest TBD battle, look at the PBAs, and create items from them
    Battle.find({
      attributes : ['avatarID', 'postBattleActions'],
      where : { id : battleId }
    }).then(({ avatarID, postBattleActions }) =>{;

      const itemsToInsert = [];
      
      // ALL PBAs FROM BATTLE
      postBattleActions.forEach(( ACTION )=>{
        let matchingPBA;
        // FOR EACH ACTION TYPE WITHIN THE postBattleActions JSON file.
        for(let actionType in ALLPBAs){
          // Find the PBA that matches the pba.action property
          let matching = ALLPBAs[actionType].find(pba => pba.action === ACTION);
          // If there's a match, assign the entire matching PBA to a variable that we'll use to get the actual item
          if(matching){
            matchingPBA = matching;
            break;
          }
        }

        // Use the matchingPBA type and name to find the exact item referenced in the PBA
        const matchingItem = ALLITEMS[matchingPBA.itemCategory].find(item => item.name === matchingPBA.name);
        // remove ID, we use autoinc here
        delete matchingItem.id;
        //console.log('MATTCHITEM = ', matchingItem);
        //console.log('AVID = ', avatarID);
        const itemToInsert = Object.assign({}, matchingItem, { avatarID })
        // Push the ITEM that matches a PBA that matches the ACTION, along with the avatarID, into an array
        itemsToInsert.push(itemToInsert);
      });


      console.log('BULK CREATE - INSERT ITEMS -', itemsToInsert);
      // INSERT all the items from the itemsToInsert array, gathered from the PBAs
      AvatarEquip.bulkCreate(itemsToInsert)
      .then((result) =>{
        console.log('RESSS - ', result);

        res.status(200).json({
          avatarID,
          postBattleActions
        });



      }).catch((error) =>{
        console.log('EERR', error);
      });



    });
  }else{
    res.status(400).json({
      message : "Need to pass Battle ID"
    });
  }

});

// DO ALL BATTLES WHERE BATTLE OUTCOME IS TBD
router.get('/do-all-battles', function(req, res, next){
  
  let allBattleIds = [];
  let allAvatarIds = [];
  let allAvatarPromises = [];
  let allFoes = [];
  let allPbaPromises = [];
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
    //console.log('ShardIndex - ', shardIndex);
    allBattleIds = [];
    allAvatarIds = [];
    allFoes = [];
    // array of arrays
    allPbaArrays = [];
    allAvatarPromises = [];

    shard.forEach((battle) =>{
      console.log('BID - ', battle.id);
      //console.log('into arrays - ', battle.id, battle.avatarID, battle.foe);
      allBattleIds.push(battle.id);
      allAvatarIds.push(battle.avatarID);
      allFoes.push(battle.foe);
      allPbaArrays.push(battle.postBattleActions);
      //console.log('BATTLE - ',battle);
      allAvatarPromises.push(Avatar.findOne(
        { where : { id: battle.avatarID }, raw : true, attributes: ['id','name','character', 'qp', 'health','power','armor','fire','air','water','earth','status', 'activityXP', 'battleXP', 'battleWins','battleLosses','battleDraws', 'battleDkos', 'photonTokens'] }
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
        // const { currentLevelByInput } = xpCalc();
        // BRA.level = currentLevelByInput(avatar.activityXP + avatar.battleXP);


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
        //TEMP CHEAT
        //BRA.power += 1000;
        //BRA.health = 10;

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
        
        //console.log('OUTCOME - ', b.outcomeData.outcome);
        //BRF.bonusXP = 50;
        //BRF.bonusPT = 50;
        
        // POST BATTLE ACTIONS
        const postBattleActions = allPbaArrays[i] || [];
        
        switch(b.outcomeData.outcome){
          case "Avatar Wins":
            xpGain = BRF.xpBounty; 
            //ptGain = BRF.ptBounty; 
            avatar.battleWins = avatar.battleWins + 1;
            //console.log('XP-bounty', xpGain);
            //console.log('PT-bounty', ptGain);
            console.log('1pbas- ',postBattleActions);
            //avatar.photonTokens += ptGain;
            console.log('Avatar id should be 253', avatar.id);
            allPbaPromises.push(doAllPbas(avatar.id, postBattleActions));
            // for email tally
            tally.avatarWins += 1;
            break;
          case "Foe Wins":
            xpGain = BRF.xpBounty * OUTCOME_XP.lossMultiplier;
            avatar.battleLosses = avatar.battleLosses + 1;
            // for email tally
            tally.foeWins += 1;
            break;
          case "Draw":
            xpGain = BRF.xpBounty * OUTCOME_XP.drawMultiplier;
            avatar.battleDraws = avatar.battleDraws + 1; 
            // for email tally
            tally.draw += 1;
            break;
          case "Double KO":
            xpGain = BRF.xpBounty * OUTCOME_XP.dkoMultiplier;
            avatar.battleDkos = avatar.battleDkos + 1;
            // for email tally
            tally.doubleKO += 1;
            break;
          default:
        }

        // Check for lvl up
        const { checkLevelUp } = xpCalc(avatar.activityXP, avatar.battleXP);
        const { leveledUp, qpEarned } = checkLevelUp(xpGain);

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
        avatar.battleXP += xpGain;
        avatar.qp += qpEarned;

        avatarUpdates[avatar.id] = { goToBattle : false, qp : avatar.qp, health : limitedAHealthRemaining, status : avatar.status, battleXP : avatar.battleXP, battleWins : avatar.battleWins, battleLosses : avatar.battleLosses, battleDraws :  avatar.battleDraws, battleDkos : avatar.battleDkos, photonTokens : avatar.photonTokens };

        // End Avatar for each
      });

      return Promise.allSettled([...allBattlePromises, ...allPbaPromises]);
    }).then((data) => {
      console.log('UPDATED ALL BATTLES AND RAN PBAS');
      console.log('data after all battles and pbas settled - ', data);
      const allUpdateAvatarPromises = [];
      allAvatarIds.forEach((avatarId, i) =>{
        //console.log('this will update - ');
        //console.log('alpaca ID and update - ',avatarId, avatarUpdates[avatarId]);

        allUpdateAvatarPromises.push(Avatar.update(avatarUpdates[avatarId],{ where: { id: avatarId } }));
      });

      return Promise.allSettled(allUpdateAvatarPromises);
      
    }).catch((error) =>{
      console.log('ERROR - ', error);
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
          resolve(runBattlesOnBatch(shard));
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


module.exports = router;