const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateJWT, authenticateAdminJWT } = require('../jwtValidation');
const router = express.Router(); 
const Avatar = require('../db').Avatar;
const AvatarItems = require('../db').AvatarItems;
const Battle = require('../db').Battle;
const { Op, literal, col, fn, QueryTypes } = require("sequelize");
const { sendBattleReportEmail } = require('../mail');
const { cloneObj, parseAvatarProperties, arrayChunker } = require('../helperFunctions');
const { REVIVE_AMOUNT, RECOVER_EARLY_MOD, RECOVERY_EFFECTIVENESS_MOD, RESTED_THRESHOLD, REGENERATION_RATE, BATTLE_SCENARIOS, OUTCOME_XP, FOE_DIFFICULTY_XP_MOD_FACTOR, FOE_NON_ACTION, AVATAR_NON_ACTION, BEGINNERS_LUCK_MAX_XP, BEGINNERS_LUCK_LIKELIHOOD } = require('../game/CONSTANTS');
const { selectFoeTemplate, generateFoeStats } = require('../game/foeFunctions');
const doScenarioAndBonus = require('../game/doScenarioAndBonus');
const { doAvatarBattlePrep, doFoeBattlePrep } = require('../game/doBattlePrep');
const doBattle = require('../game/doBattle');
const xpCalc = require('../game/upgrades/xpCalc');
const avCalc = require('../game/upgrades/avCalc');
const { doAllPbas, doPostBattleEffects } = require('../game/runPostBattleActions');
const { determinePostBattleActions } = require('../game/onGoToBattle');
const ALLPBAs = require('../game/postBattleActions.json');
const chance = require('chance')();

// FORCE A CYCLE OF HEALTH REGEN FOR ALL ALLIES
router.get('/regenerate-health', authenticateAdminJWT, (req, res) =>{
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for /regenerate-health endpoint");
  }
  
  //Get all avatars who aren't at full health
  return Avatar.findAll(
    { where: { [Op.or]: [{status: 'Recovering'}, {status: 'Infected'}] }, raw: true, attributes: ['health','maxHealth','recovery','status', 'owner', 'statusFade'] },
  ).then((results) => {
    const allPromises = []
    
    // Loop over each avatar and either regen health if recovering or other status effects
    results.forEach((avatar) =>{
      avatar = parseAvatarProperties(avatar);

      let avatarHealth = avatar.health;
      const maxHealth = avatar.maxHealth;
      const recovery = avatar.recovery;
      const recoveryRetarder = recovery/(recovery+RECOVERY_EFFECTIVENESS_MOD); 
      const adjRegenRate = recovery - Math.round( recovery * recoveryRetarder);
      let avatarStatus = avatar.status;
      let avatarStatusFade = avatar.statusFade;

      // Check avatar status and run appropriate action
      switch(avatarStatus){
        case 'Infected':
          const infectAmount = Math.floor(adjRegenRate / 2);
          // First check if this infect proc will KO hero, if so set him to KOed and health to zero. BREAK so he doesn't regain health
          if((avatarHealth - infectAmount) <= 0){
            avatarStatus = 'Knocked Out';
            avatarHealth = 0;
            avatarStatusFade = 0;
            break;
          // Otherwise, if no more counters, set to recovering and no break statement - the hero will recover health this round
          }else if(avatarStatusFade === 0){
            avatarStatus = 'Recovering';
          
          // If Fade counter is greater than zero AND hero wont be KO from 1 more proc, reduce health of avatar by infect amount and decrement counter. BREAK statement
          }else{
            avatarHealth = avatarHealth - infectAmount;
            --avatarStatusFade;
            break;
          }
        case 'Recovering':
          // If one tick of health recovery is over maxHealth, just assign maxHealth
          if((avatarHealth + adjRegenRate) > maxHealth){
            avatarHealth = maxHealth;
          // Otherwise add one tick of health back to avatar's health
          }else{
            avatarHealth += adjRegenRate;
          }
          // Update status to 'Rested' if over 'Rested' threshold
          if((avatarHealth / maxHealth) >= RESTED_THRESHOLD){
            avatarStatus = 'Rested';
          }
          break;
        default: 
          break;
      }

      allPromises.push(Avatar.update(
        {health : avatarHealth, status : avatarStatus, statusFade : avatarStatusFade},
        { where: { owner: avatar.owner },
        returning: true,
        raw: true, 
        plain: true
      }));
    });
    return Promise.allSettled(allPromises);

  }).then((results) => {
    results.forEach((result) => console.log('All Regenerate Results - ', result.status));
    res.formatter.ok(null, 'Successfully ran /regenerate-health');
  }).catch((error) =>{
    console.log('ERROR DOING BULK HEALTH UPDATE', error);
    res.formatter.serverError(error.toString(), `Error running /regenerate-health`);
  });
});


// FORCE A CYCLE OF KO RECOVERY CHECK FOR KOED AVATARS
router.get('/try-recovery', authenticateAdminJWT, (req, res) =>{
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for /try-recovery endpoint");
  }
  
  // Get all avatars who are KOed
  return Avatar.findAll(
    { where: { status: "Knocked Out" }, raw: true, attributes: ['health', 'recovery','status', 'owner'] },
  ).then((results) => {
    console.log('all KO results', results);
    const recoveredAvatars = []
    
    if(results.length){
      // Loop over each Recovering Avatar and add up to default regen + avatar's regen to health
      results.forEach((result, i) =>{
        const avatar = parseAvatarProperties(result);

        const recovery = avatar.recovery
        const recoverEarlyChance = (recovery / (recovery + RECOVER_EARLY_MOD)) * 100;
        const recoveredEarly = chance.bool({ likelihood: recoverEarlyChance });
        //console.log('REC - ', recovery, 'REC EARLY CHANCE - ', recoverEarlyChance, recoveredEarly);
        // Revive avatar to the REVIVE_AMOUNT in constants.js
        if(recoveredEarly){
          console.log('Recovering!', avatar.owner);
          return recoveredAvatars.push(avatar.owner);
        }
        return null;
      });
      console.log('recovered avs', recoveredAvatars);
      return Avatar.update(
        { health : REVIVE_AMOUNT, status : 'Recovering' },
        { where: { owner: { [Op.in]: recoveredAvatars } }}
      );
    }else{
      res.formatter.ok(null, 'Successfully ran /try-recovery, no Avatars to Recover')
    }
  }).then(()=>{
    return res.formatter.ok(null, 'Successfully ran /try-recovery');
  }).catch((error) =>{
    console.log('ERROR DOING BULK HEALTH UPDATE', error);
    res.formatter.serverError(error.toString(), `Error running /try-recovery`);
  });
});


// RANDOMLY GENERATE A FOE
router.post('/generate-foe', body('avatar').isObject(), authenticateAdminJWT, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for /generate-foe endpoint");
  }
  const foe = selectFoeTemplate(req.body.avatar.level);
  const foeWithStats = Object.assign({}, foe, generateFoeStats(req.body.avatar, foe));
  if(foeWithStats){console.log(foeWithStats);
    res.formatter.ok(foeWithStats);
  }else{
    const error =  new Error("Couldn't generate foe");
    res.formatter.serverError(error);
  }
});

// MOCK ENDPOINT for DETERMINING PBAs
router.post('/mock-determine-pbas', body('avatar').isObject(), authenticateAdminJWT, (req, res) =>{
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for /mock-determine-pbas");
  }
  const foe = selectFoeTemplate(req.body.avatar.level);
  const foeWithStats = Object.assign({}, foe, generateFoeStats(req.body.avatar, foe));

  new Promise((resolve, reject) =>{
    return determinePostBattleActions(req.body.avatar, foeWithStats, resolve, reject);
  }).then((postBattleActions) =>{
    res.formatter.ok({ postBattleActions });
  }).catch((error)=>{
    res.formatter.serverError(error.toString());
  });
});

// MOCK ENDPOINT for RUNNING PBAs
router.get('/mock-run-pbas', authenticateAdminJWT, (req, res) => {
  console.log('didnt get here');
  const errors = validationResult(req);
  if(!errors.isEmpty){
    return res.formatter.badRequest(errors.array(), 'Validation Error - /mock-run-pbas endpoint');
  }
  let _avatarID, _postBattleActions;
  // only meant to grab latest TBD battle, look at the PBAs, and create items from them
  Battle.findOne({
    attributes : ['avatarID', 'postBattleActions'],
    where : { outcome : 'TBD' }
  }).then(({ avatarID, postBattleActions }) =>{
    _avatarID = avatarID;
    _postBattleActions = postBattleActions;
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

      // There should always be a matchingPBA here, if not, I forgot to add one to the postBattleActions.json
      if(matchingPBA){
        // Push the ITEM that matches a PBA that matches the ACTION, along with the avatarID, into an array
        itemsToInsert.push({ avatarID, itemID : matchingPBA.itemID });
      }
      
    });

    console.log('BULK CREATE - INSERT ITEMS -', itemsToInsert);
    // INSERT all the items from the itemsToInsert array, gathered from the PBAs
    return AvatarItems.bulkCreate(itemsToInsert);

  }).then(() =>{
    res.formatter.ok({
      avatarID : _avatarID,
      postBattleActions : _postBattleActions
    });
  }).catch((error) =>{
    res.formatter.serverError(error.toString(), "Database or Server code error for POST /mock-run-pbas endpoint");
  });
});

// DO ALL BATTLES WHERE BATTLE OUTCOME IS TBD
router.get('/run-all-battles', authenticateAdminJWT, (req, res) => {
  // Figure out which season it is, so a 25% bonus can be given to BRA & BRF
  const { determineAstrologySeason } = avCalc();
  const seasonalBonusElement = determineAstrologySeason(Date.now()).element.toLowerCase();

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
    allEffects = [];
    allFoes = [];
    // array of arrays
    allPbaArrays = [];
    allAvatarPromises = [];

    shard.forEach((battle) =>{
      console.log('BID - ', battle.id);
      //console.log('into arrays - ', battle.id, battle.avatarID, battle.foe);
      allBattleIds.push(battle.id);
      allAvatarIds.push(battle.avatarID);
      allEffects.push(battle.effects);
      allFoes.push(battle.foe);
      allPbaArrays.push(battle.postBattleActions);
      //console.log('BATTLE - ',battle);
      allAvatarPromises.push(Avatar.findOne(
        { where : { id: battle.avatarID }, raw : true, attributes: ['id','name','character', 'qp', 'health','power','armor','fire','air','water','earth','status', 'activityXP', 'battleXP', 'battleWins','battleLosses','battleDraws', 'battleDkos', 'photonTokens'] }
      ));
    });

    return Promise.allSettled(allAvatarPromises)

    .then((results) =>{
      results.forEach((result) => console.log('Find Avatar Promises', result.status));
      const avatars = results.map((result) => result.value);

      //console.log('AV LENGTH - ', avatars.length);
      //console.log('AVS - ', avatars);
      avatars.forEach((avatar, i) =>{
        // BATTLE STEP 1 - PLAYER DECIDES TO GO TO BATTLE (happens earlier when a user clicks 'Battle')

        // Non-Whole numbers come out of DB as strings, so need to convert to numbers here
        avatar = parseAvatarProperties(avatar);
        const foeWithStats  = allFoes[i];

        // Beginners luck Makes unfavorable scenarios and foe goesFirst less common for players below level 15
        let beginnersLuck = false;
        const avTXP = avatar.activityXP + avatar.battleXP;
        if(avTXP < BEGINNERS_LUCK_MAX_XP){
          beginnersLuck = chance.bool({ likelihood: BEGINNERS_LUCK_LIKELIHOOD});
        }

        // BATTLE STEP 2 - ENCOUNTER SCENARIO IS DECIDED AND BONUSES GIVEN
        let { scenario, sAvatar, sFoe  } = doScenarioAndBonus(cloneObj(avatar), cloneObj(foeWithStats), beginnersLuck);
        console.log('SAV1', sAvatar);
        // BATTLE STEP 3 APPLY EFFECTS FROM ITEMS
        if(allEffects[i] && allEffects[i].length){
          const preBattleEffects = allEffects[i].filter(effect => effect.type === 'prebattle');
          // Buff or debuff hero and foe based on item effects
          // If new item effects are added, they need to be added in this function:
          const abp = doAvatarBattlePrep(sAvatar, sFoe, preBattleEffects, scenario.id);
          sAvatar = abp.avatar;
          sFoe = abp.foe;
        }
        console.log('SAV2', sAvatar);
        // BATTLE STEP 4 - FOE USES prebattle ABILITY
        if(foeWithStats.ability && foeWithStats.ability.type === 'prebattle'){
          if(scenario.id !== FOE_NON_ACTION){
            const fbp = doFoeBattlePrep(sAvatar, sFoe, foeWithStats.ability);
            sAvatar = fbp.avatar;
            sFoe = fbp.foe;
          }
        }
        console.log('SAV3', sAvatar);
        // Element by Seasonal Element Bonus
        sAvatar[seasonalBonusElement] *= 1.25;
        sFoe[seasonalBonusElement] *= 1.25;

        const BRA = sAvatar;
        const BRF = sFoe;

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
          // 75% Chance the Avatar will go first if below level 15
          if(beginnersLuck){
            goesFirst = 'Avatar';
          }else{
            const randDecider = Math.floor(Math.random() * 2);
            goesFirst = randDecider === 0 ? 'Avatar' : 'Foe';
          }
        }
        console.log('BRA=', BRA);
        // BATTLE STEP 5 - EXCHANGE DAMAGE
        const b = doBattle(BRA, BRF, goesFirst);

        // SAVE DATA
        let xpGain, ptGain = 0;
        
        //console.log('OUTCOME - ', b.outcomeData.outcome);
        //BRF.bonusXP = 50;
        //BRF.bonusPT = 50;
        
        // POST BATTLE ACTIONS
        const postBattleActions = allPbaArrays[i] || [];
        
        switch(b.outcomeData.outcome){
          case "Avatar Wins":
            xpGain = BRF.xpBounty; 
            ptGain = BRF.ptBounty; 
            avatar.battleWins = avatar.battleWins + 1;
            //console.log('XP-bounty', xpGain);
            //console.log('PT-bounty', ptGain);
            //console.log('1pbas- ',postBattleActions);
            avatar.photonTokens += ptGain;
            //console.log('Avatar id should be 253', avatar.id);
            if(postBattleActions){
              allPbaPromises.push(doAllPbas(avatar.id, postBattleActions, b.outcomeData.outcome));
            }
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
            if(postBattleActions){
              allPbaPromises.push(doAllPbas(avatar.id, postBattleActions, b.outcomeData.outcome));
            }
            // for email tally
            tally.doubleKO += 1;
            break;
          default:
        }

        // Check for lvl up
        const { checkLevelUp } = xpCalc(avatar.activityXP, avatar.battleXP);
        const { leveledUp, qpEarned } = checkLevelUp(xpGain);
          console.log('B=', b);
        allBattlePromises.push(Battle.update({
          scenario : scenario.id,
          outcome : b.outcomeData.outcome,
          aStatus : b.outcomeData.avatarStatus,
          aPhyDamage : b.aPhyDamage,
          fPhyReduction : b.fPhyReduction,
          fPhyDamage : b.fPhyDamage,
          aPhyReduction : b.aPhyReduction,
          xpGain,
          ptGain,
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
        console.log('AVATAR CHECK adj - ', avatar, limitedAHealthRemaining, b.outcomeData.avatarStatus,xpGain, qpEarned);
        avatar.status = b.outcomeData.avatarStatus;
        avatar.battleXP += xpGain;
        avatar.qp += qpEarned;

        // If Any postbattle abilities exist, use them
        // Now if i want, new items can do things in this function!
        avatar = doPostBattleEffects(avatar, foeWithStats, b.outcomeData.outcome);
        console.log('AVATAR CHECK - ', avatar);
        avatarUpdates[avatar.id] = { goToBattle : false, qp : avatar.qp, health : limitedAHealthRemaining, status : avatar.status, statusFade : avatar.statusFade, battleXP : avatar.battleXP, battleWins : avatar.battleWins, battleLosses : avatar.battleLosses, battleDraws :  avatar.battleDraws, battleDkos : avatar.battleDkos, photonTokens : avatar.photonTokens };

        // End Avatar for each
      });

      return Promise.allSettled([...allBattlePromises, ...allPbaPromises]);
    }).then((data) => {
      data.forEach((result) => console.log('Battle & PBS Promises:', result.status));
      //console.log('UPDATED ALL BATTLES AND RAN PBAS');
      //console.log('data after all battles and pbas settled - ', data);
      const allUpdateAvatarPromises = [];
      allAvatarIds.forEach((avatarId, i) =>{
        // console.log('this will update - ');
        // console.log('alpaca ID and update - ',avatarId, avatarUpdates[avatarId]);

        allUpdateAvatarPromises.push(Avatar.update(avatarUpdates[avatarId],{ where: { id: avatarId } }));
      });

      return Promise.allSettled(allUpdateAvatarPromises);
    }).then((results) =>{
      results.forEach((result) => console.log('AvatarUpdate Promises', result.status));
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
  }).then((results) => {
      results.forEach((result) => console.log('All battle Promise Results - ', result.status))
      console.log('ALL AVATARS UPDATED');
      tally.total = tally.foeWins + tally.avatarWins + tally.draw + tally.doubleKO;
      tally.avWinPercent = Math.floor(tally.avatarWins / (tally.foeWins + tally.avatarWins)) || 0;
      tally.avWinPercentOverall = Math.floor(tally.avatarWins / tally.total) || 0;
      tally.tiePercent = Math.floor((tally.draw + tally.doubleKO) / tally.total) || 0;
      console.log('tally', tally, 'updates', avatarUpdates);

      return sendBattleReportEmail(tally);
  }).then((data) =>{
    console.log('Result Tally email sent successfully',data);
    res.formatter.ok(data, 'Successfully ran all battles through endpoint - GET /run-all-battles');
  }).catch((error)=>{
    console.log('error in cronBattleHour', error);
  });

  
});


module.exports = router;