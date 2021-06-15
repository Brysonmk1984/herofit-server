const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateJWT } = require('../jwt/validateJWT');
const router = express.Router(); 
const { Op, col } = require("sequelize");
const { Avatar, AvatarItems, Battle, Items } = require('../config/db');
const { determineFoeWithStats } = require('../game/foeFunctions');
const villains = require('../game/villains.json');
const xpCalc = require('../game/upgrades/xpCalc');
const avCalc = require('../game/upgrades/avCalc');
const moment = require('moment');
const { determineXpBounty, determinePtBounty } = require('../game/runPostBattleActions');
const { determineItemEffects, determinePostBattleActions } = require('../game/onGoToBattle');
const { OUTCOME_XP, BEGINNERS_LUCK_MAX_XP, BEGINNERS_LUCK_LIKELIHOOD, FOE_NON_ACTION } = require('../game/CONSTANTS'); 
const ALLPBAs = require('../game/postBattleActions.json');
// All needed only for new single battle function
const { parseAvatarProperties, cloneObj } = require('../lib/helperFunctions');
const { doAllPbas, doPostBattleEffects } = require('../game/runPostBattleActions');
const doScenarioAndBonus = require('../game/doScenarioAndBonus');
const { doAvatarBattlePrep, doFoeBattlePrep } = require('../game/doBattlePrep');
const doBattle = require('../game/doBattle');
const chance = require('chance')();
const instantiateBattle = require('../game/instantiateBattle');

// USER CLICKED 'GO TO BATTLE'
router.post('/insert-battle', body('email').isEmail(), body('avatar').isObject(), body('avatar.goToBattle').isBoolean().custom((goToBattle) => goToBattle === false), authenticateJWT, (req, res) => {
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    return res.formatter.badRequest(errors.array(), "Validation Error - POST /insert-battle endpoint");
  }
  const avatar = req.body.avatar;
  let battleObj;
  instantiateBattle(avatar.id)
  .then((result) =>{
    if(result.error){
      throw result.error;
    }
    battleObj = result;
    return Avatar.update({ 
      goToBattle : true,
    },{ where: { owner: req.body.email }, raw: true })
  }).then((result) =>{
    if(result.error){
      throw result.error;
    }
    res.formatter.ok(battleObj);

  }).catch((error)=>{
    error = error.toString();
    console.log(`Couldn't Send Avatar to battle: ${error}`);
    res.formatter.serverError(error, 'Database update or server code error - POST /insert-battle');
  });

});

// USER Logs in after a battle, or clicks button to retrieve report
router.post('/fetch-battle-report', body('avatarID').isNumeric(), authenticateJWT, (req, res) =>{

  const errors = validationResult(req);
  if(!errors.isEmpty()){
    return res.formatter.badRequest(errors.array(), "Validation Error - POST /fetch-battle-report");
  }

  Battle.findAll({
    limit: 1,
    where: { 
      avatarID: req.body.avatarID,
      [Op.not]: { outcome: "TBD" }
    },
    order: [ [ 'createdAt', 'DESC' ]],
    raw : true
  }).then((result) =>{

    if(result.length && !result[0].seenReport){
      
      adjResult = result[0];
      adjResult.aPhyReduction = Math.floor(parseInt(adjResult.aPhyReduction));
      adjResult.fPhyReduction = Math.floor(parseInt(adjResult.fPhyReduction));
      
      // Figure out which season it is, so a 25% bonus can be given to BRA & BRF
      const { determineAstrologySeason } = avCalc();  
      adjResult.seasonalBonusElement =  determineAstrologySeason(adjResult.updatedAt);

      // IF the avatar won, Get the items acquired from the action types in the battle report
      if(adjResult.outcome === 'Avatar Wins' && adjResult.postBattleActions){

        Items.findAll({
          attributes: ['type','name','description','lore','effects','icon','class','exhaustible','ptCost','action'],
          where : { action : { [Op.in] : adjResult.postBattleActions } }
        }).then((items) =>{
          adjResult.itemsAquired = items;
          res.formatter.ok({ result : adjResult }, 'Retrieved Latest Battle Results');
        }).catch((error) =>{
          console.log('ERR', error);
          res.formatter.serverError(error.toString(), 'No Battle Results for /fetch-battle-report Endpoint');
        });
      }else{
        res.formatter.ok({ result : adjResult }, 'Retrieved Latest Battle Results');
      }
    }else{
      res.formatter.ok({ result : null }, 'No Results, must be new user');
    }
  }).catch((error) =>{
    console.log('ERR', error);
    res.formatter.serverError(error.toString(), 'No Battle Results for /fetch-battle-report Endpoint');
  });
});

// Anyone clicks on a battle from anyone's profile page
router.post('/fetch-battle-report-by-id', body('avatarID').isNumeric(), body('id').isNumeric(), (req, res) =>{
  const { avatarID, id } = req.body;
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    return res.formatter.badRequest(errors.array(), "Validation Error - POST /fetch-battle-report-by-id");
  }

  let adjResult;
  Battle.findOne({
    where: { id },
    raw : true
  }).then((result) =>{
    adjResult = result;
    adjResult.aPhyReduction = Math.floor(parseInt(adjResult.aPhyReduction));
    adjResult.fPhyReduction = Math.floor(parseInt(adjResult.fPhyReduction));

     // IF the avatar won, Get the items aquired from the action types in the battle report
    // STILL NOT HANDLING DKO fetch item for beating foe list
     if(adjResult.outcome === 'Avatar Wins' && adjResult.postBattleActions){
      return Items.findAll({
        attributes: ['type','name','description','lore','effects','icon','class','exhaustible','ptCost','action'],
        where : { action : { [Op.in] : adjResult.postBattleActions } }
      });
    }
    return null;
  }).then((items) =>{
    adjResult.itemsAquired = items;
    // Need correct Skin :( just to show the user in the battle report modal on the Profile Page
    return AvatarItems.findOne({ 
      attributes : ['itemID','avatarID'],
      where : { avatarID : id, equipped : true },
      raw : true
    });

  }).then((skinItemInstance) =>{
    adjResult.avatarSkin = skinItemInstance;

    // Figure out which season it is, so a 25% bonus can be given to BRA & BRF
    const { determineAstrologySeason } = avCalc();
    const startedTrackingSeasons = moment('2021-03-04', 'YYYY-MM-DD');
    const battleDate = moment(adjResult.createdAt);
    if(battleDate && battleDate.isAfter(startedTrackingSeasons)){
      adjResult.seasonalBonusElement =  determineAstrologySeason(adjResult.updatedAt);
    }else{ adjResult.seasonalBonusElement = null; }

    res.formatter.ok({ adjResult });
  }).catch((error) =>{
    console.log('ERRR', error);
    res.formatter.serverError(error.toString(), 'No Results for /fetch-battle-report-by-id Endpoint');
  });
});

// USER sees a battle report, mark it so in the database
router.post('/update-battle-report-seen', body('id').isNumeric(), authenticateJWT, (req, res) =>{
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    return res.formatter.badRequest(errors.array(), "Validation Error - POST /update-battle-report-seen");
  }

  Battle.update({ seenReport : true},{ where: { id : req.body.id } })
  .then(()=>{

    res.formatter.ok({ message : 'Successfully updated seenReport' });
  }).catch((error) =>{
    console.log("couldn't update seen by", error);
    res.formatter.serverError(error.toString(), "Failed to update seenReport");
  });
});

// USER opens upcoming battle window after having already gone
router.post('/fetch-upcoming-foe-and-rewards', body('avatarID').isNumeric(), authenticateJWT, (req, res) =>{

  const errors = validationResult(req);
  if(!errors.isEmpty()){
    return res.formatter.badRequest(errors.array(), "Validation Error - POST /fetch-upcoming-foe-and-rewards");
  }
  const { avatarID } = req.body;
  Battle.findOne({ 
      where : { avatarID, outcome: "TBD" }, 
      raw : true, 
      attributes: ['foe', 'postBattleActions'] 
  }).then((battle) =>{
    //console.log(`upcoming battle for ${avatarID} - `, battle);
    if(battle){
      let rewards = null;
      if(battle.postBattleActions){
   
        // Get the items aquired from the action types in the battle report
        rewards = battle.postBattleActions.map(action => {
          let matchingPBA;
          for(let actionType in ALLPBAs){
            const match = ALLPBAs[actionType].find(pba => {
              return pba.action === action;
            });
            if(match){
              matchingPBA = match;
              break;
            }
          } 

          return matchingPBA.itemID;
        });
        if(rewards.length){
          Items.findAll({
            attributes: ['type','name','description','lore','effects','icon','class','exhaustible','ptCost','action'],
            where : { id : { [Op.in] : rewards }}
          }).then((matchingItems) =>{
            return res.formatter.ok({ foe : battle.foe, rewards : matchingItems });
          }).catch((error) =>{
            res.formatter.serverError(error.toString(), `Couldn't retrieve upcoming rewards - ${avatarID}`);
          });
        }else{
          res.formatter.ok({ foe : battle.foe, rewards });
        }
      }else{
        res.formatter.ok({ foe : battle.foe, rewards });
      }
    }else{
      console.log(`COULDNT FIND BATTLE ${avatarID}`, battle);

      const error = new Error("No battles on record");
      res.formatter.serverError(error.toString(), `Couldn't retrieve foe for upcoming battle! No Battle Record listed. USER - ${avatarID}`);
    }
  }).catch((error) =>{
    console.log('THE ERR', error);
    res.formatter.serverError(error.toString(), "Couldn't retrieve foe for upcoming battle!");
  });
});

// Retrieve list of Villains for Campaign page
router.get('/villain-list', (req, res) =>{
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    return res.formatter.badRequest(errors.array(), "Validation Error - GET /villain-list");
  }

  if(villains){
    res.formatter.ok({ villains });
  }else{
    const error = new Error("No battles on record");
    res.formatter.serverError(error.toString(), "Couldn't retrieve villain list");
  }
});

// Fetch battles won by a particular hero for Campaign page
router.post('/fetch-battles-won-or-dko', body('avatarID').isNumeric(), authenticateJWT, (req, res) =>{
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    return res.formatter.badRequest(errors.array(), "Validation Error - POST /fetch-battles-won");
  }
  Battle.findAll({ 
      where : { 
        avatarID: req.body.avatarID, 
        [Op.or]: [{ outcome: 'Avatar Wins' }, { outcome: 'Double KO' }] 
      }, 
      raw : true, 
      attributes: ['outcome', 'foe'] 
  }).then((battles) =>{
    if(battles){
      res.formatter.ok({ battles });
    }else{
      const error = new Error("No battles on record");
      res.formatter.serverError(error.toString(), 'Retrieved Data Error for /fetch-battles-won' );
    }
  }).catch((error) =>{
    res.formatter.serverError(error.toString(), 'Retrieved Data Error for /fetch-battles-won');
  });
});

// Runs one specific battle... currently only used if a battle fails and debug purposes
// Soon will be used when users earn an item that starts a battle
router.post('/run-specific-battle', body('avatar').isObject(), authenticateJWT, (req, res) => {
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    return res.formatter.badRequest(errors.array(), "Validation Error - POST /run-specific-battle");
  }

  let { avatar } = req.body;

  // Figure out which season it is, so a 25% bonus can be given to BRA & BRF
  const { determineAstrologySeason } = avCalc();
  const seasonalBonusElement = determineAstrologySeason(Date.now()).element.toLowerCase();

  let battle = null;
  let battleResult = null;
  let battleScenario = null;
  let xpGain, ptGain = 0;
  let leveledUp = false;
  let foe;
  let BRA, BRF;
  let _checkLevelUp;

  Battle.findOne({ where: { outcome : 'TBD', avatarID : avatar.id }, raw : true })
  .then((battleInstance) =>{
    battle = battleInstance;
    console.log('BATTLE', battle, avatar);
    const foeWithStats = battle.foe;
    foe = foeWithStats;
    const { checkLevelUp } = xpCalc(avatar.activityXP, avatar.battleXP);
    _checkLevelUp = checkLevelUp;
   
    // BATTLE STEP 1 - PLAYER DECIDES TO GO TO BATTLE (happens earlier when a user clicks 'Battle')
    

    // Beginners luck Makes unfavorable scenarios and foe goesFirst less common for players below level 15
    let beginnersLuck = false;
    const avTXP = avatar.activityXP + avatar.battleXP;
    if(avTXP < BEGINNERS_LUCK_MAX_XP){
      beginnersLuck = chance.bool({ likelihood: BEGINNERS_LUCK_LIKELIHOOD});
    }


    // BATTLE STEP 2 - ENCOUNTER SCENARIO IS DECIDED AND BONUSES GIVEN
    let { scenario, sAvatar, sFoe  } = doScenarioAndBonus(cloneObj(avatar), cloneObj(foeWithStats), beginnersLuck);
    // Needed for further down
    battleScenario = scenario;

    // BATTLE STEP 3 APPLY EFFECTS FROM ITEMS
    if(battle.effects && battle.effects.length){
      const preBattleEffects = battle.effects.filter(effect => effect.type === 'prebattle');
      // Buff or debuff hero and foe based on item effects
      // If new item effects are added, they need to be added in this function:
      const abp = doAvatarBattlePrep(sAvatar, sFoe, preBattleEffects, scenario.id);
      sAvatar = abp.avatar;
      sFoe = abp.foe;
    }

    // BATTLE STEP 4 - FOE USES prebattle ABILITY
    if(foeWithStats.ability && foeWithStats.ability.type === 'prebattle'){
      if(scenario.id !== FOE_NON_ACTION){
        const fbp = doFoeBattlePrep(sAvatar, sFoe, foeWithStats.ability);
        sAvatar = fbp.avatar;
        sFoe = fbp.foe;
      }
    }
    

    // Element by Seasonal Element Bonus
    sAvatar[seasonalBonusElement] *= 1.25;
    sFoe[seasonalBonusElement] *= 1.25;
    BRA = sAvatar;
    BRF = sFoe;

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

    //console.log('BRF=', BRA, BRF);
    // BATTLE STEP 5 - EXCHANGE DAMAGE
    b = doBattle(BRA, BRF, goesFirst);
    // Needed for further down
    battleResult = b;


    //console.log('OUTCOME - ', b.outcomeData.outcome);
    //BRF.bonusXP = 50;
    //BRF.bonusPT = 50;


    // POST BATTLE ACTIONS
    const postBattleActions = battle.postBattleActions;
    const allPbaPromises = [];   
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
        break;
      case "Foe Wins":
        xpGain = BRF.xpBounty * OUTCOME_XP.lossMultiplier;
        avatar.battleLosses = avatar.battleLosses + 1;
        break;
      case "Draw":
        xpGain = BRF.xpBounty * OUTCOME_XP.drawMultiplier;
        avatar.battleDraws = avatar.battleDraws + 1; 
        break;
      case "Double KO":
        xpGain = BRF.xpBounty * OUTCOME_XP.dkoMultiplier;
        avatar.battleDkos = avatar.battleDkos + 1;
        if(postBattleActions){
          allPbaPromises.push(doAllPbas(avatar.id, postBattleActions, b.outcomeData.outcome));
        }
        break;
      default:
    }

    return Promise.allSettled(allPbaPromises);
  }).then(() =>{
    // Check for lvl up
    const leveledUpResults = _checkLevelUp(xpGain);
    
    //Needed for next then
    leveledUp = leveledUpResults.leveledUp;
    
    const limitedAHealthRemaining = b.aHealthRemaining < 0 ? 0 : b.aHealthRemaining;
    avatar.status = b.outcomeData.avatarStatus;
    avatar.battleXP += xpGain;
    avatar.qp += leveledUpResults.qpEarned;

    // If Any postbattle abilities exist, use them
    // Now if i want, new items can do things in this function!
    avatar = doPostBattleEffects(avatar, foe, b.outcomeData.outcome);
    const avatarUpdates = { goToBattle : false, qp : avatar.qp, health : limitedAHealthRemaining, status : avatar.status, statusFade : avatar.statusFade, battleXP : avatar.battleXP, battleWins : avatar.battleWins, battleLosses : avatar.battleLosses, battleDraws :  avatar.battleDraws, battleDkos : avatar.battleDkos, photonTokens : avatar.photonTokens };


    // Update Av first, then the battle record
    return Avatar.update(avatarUpdates, { where: { id: avatar.id } })

  }).then(() =>{
    return Battle.update({
      scenario : battleScenario.id,
      outcome : battleResult.outcomeData.outcome,
      aStatus : battleResult.outcomeData.avatarStatus,
      aPhyDamage : battleResult.aPhyDamage,
      fPhyReduction : battleResult.fPhyReduction,
      fPhyDamage : battleResult.fPhyDamage,
      aPhyReduction : battleResult.aPhyReduction,
      xpGain,
      ptGain,
      leveledUp : leveledUp,
      aHealthRemaining : battleResult.aHealthRemaining,
      fHealthRemaining : battleResult.fHealthRemaining,
      foe,
      avatar,
      bra : BRA,
      brf : BRF,
      aElmDamage : battleResult.aElmDamage,
      fElmReduction : battleResult.fElmReduction,
      fElmDamage : battleResult.fElmDamage,
      aElmReduction : battleResult.aElmReduction,
      roundBreakdown : battleResult.roundBreakdown
    },
    { where: { id: battle.id }, raw : true }
    );

  }).then((data) =>{
    res.formatter.ok(data);
  }).catch((error) =>{console.log('ERROR', error);
    res.formatter.serverError(error.toString(), 'Retrieved Data Error for /run-specific-battle');
  });

});

module.exports = router;