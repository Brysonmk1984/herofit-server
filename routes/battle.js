const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateJWT } = require('../jwtValidation');
const router = express.Router(); 
const { Op } = require("sequelize");
const Avatar = require('../db').Avatar;
const AvatarItems = require('../db').AvatarItems;
const Battle = require('../db').Battle;
const Items = require('../db').Items;
const { selectFoeTemplate, generateFoeStats } = require('../game/foeFunctions');
const villains = require('../game/villains.json');
const xpCalc = require('../game/upgrades/xpCalc');
const avCalc = require('../game/upgrades/avCalc');
const moment = require('moment');
const { determineXpBounty, determinePtBounty } = require('../game/runPostBattleActions');
const { determinePostBattleActions } = require('../game/onGoToBattle');
const { OUTCOME_XP } = require('../game/constants'); 
const ALLPBAs = require('../game/postBattleActions.json');

// USER CLICKED 'GO TO BATTLE'
router.post('/insert-battle', body('email').isEmail(), body('avatar').isObject(), body('avatar.goToBattle').isBoolean().custom((goToBattle) => goToBattle === false), authenticateJWT, (req, res) => {
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    return res.formatter.badRequest(errors.array(), "Validation Error - POST /insert-battle endpoint");
  }

  const avatar = req.body.avatar;
  //console.log('GTB Avatar - ', avatar);
  const { currentLevelByInput } = xpCalc();
  const currentLevel = currentLevelByInput(avatar.activityXP + avatar.battleXP);


  const foeTemplate = selectFoeTemplate(currentLevel);

  let foeName;

  if(foeTemplate.type === 'Shadow-Self'){
    foeName = `Shadow ${avatar.name}`;
  }else{
    // specific foe for testing purposes
    //foeName = foeTemplate.foe[5];
    
    foeName = foeTemplate.foe[Math.floor(Math.random() * foeTemplate.foe.length)];
  }

  const foe = {
    id : foeTemplate.id,
    type : foeTemplate.type,
    name : foeName,
    ability : foeTemplate.ability,
    class : foeTemplate.class
  }
  const foeWithStats = Object.assign({}, foe, generateFoeStats(avatar, foe));

  
  foeWithStats.xpBounty = determineXpBounty(OUTCOME_XP.base, foeWithStats.difficulty, currentLevel, foeTemplate.bonusXpBase);
  foeWithStats.ptBounty = determinePtBounty(currentLevel, foeTemplate.bonusPtBase);
  
  //console.log('FWS! - ', foeWithStats);
  let postBattleActions;
  // PROMISE - need to determine previous battles.
  new Promise((resolve, reject) =>{
    return determinePostBattleActions(avatar, foeWithStats, resolve, reject);
  }).then((pbas) =>{
    // Need parent context;
    postBattleActions = pbas;

    return Battle.create({
      owner: req.body.email,
      avatarID: avatar.id,
      avatarName: avatar.name,
      foe : foeWithStats,
      outcome: "TBD",
      seenReport : false,
      postBattleActions
    }, 
    {raw : true}
    );
  }).then(() =>{
    return Avatar.update({ 
      goToBattle : true,
    },{ where: { owner: req.body.email }, raw: true })
    .then((result) =>{
      // SHOULD NEVER HAPPEN
      if(!result){ console.log('THIS ERROR SHOULD NEVER HAPPEN');
        const error =  new Error(`No Avatar associated with user ${req.body.email}`);
        res.formatter.serverError(error, 'Attempted to update Avatar goToBattle status but no results');
      }

      // Get the items aquired from the action types in the battle report
      const rewards = postBattleActions.map(action => {
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
          attributes: ['type','name','description','lore','effect1','effect2','icon','class','exhaustible','ptCost','action'],
          where : { id : { [Op.in] : rewards }}
        }).then((matchingItems) =>{
          res.formatter.ok({
            goToBattle : true,
            foe : foeWithStats,
            rewards : matchingItems
          });
        }).catch((error) =>{
          res.formatter.serverError(error.toString(), `Couldn't retrieve upcoming rewards - ${avatarID}`);
        });
      }else{
        res.formatter.ok({
          goToBattle : true,
          foe : foeWithStats,
          rewards
        });
      }

    });
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
    if(result.length){
      //console.log('RESBATTLE - ', result[0]);

      adjResult = result[0];
      adjResult.aPhyReduction = Math.floor(parseInt(adjResult.aPhyReduction));
      adjResult.fPhyReduction = Math.floor(parseInt(adjResult.fPhyReduction));

      // IF the avatar won, Get the items aquired from the action types in the battle report
      if(adjResult.outcome === 'Avatar Wins'){
        Items.findAll({
          attributes: ['type','name','description','lore','effect1','effect2','icon','class','exhaustible','ptCost','action'],
          where : { action : { [Op.in] : adjResult.postBattleActions } }
        }).then((items) =>{
          adjResult.itemsAquired = items;
    
          if(!result[0].seenReport){
            // Figure out which season it is, so a 25% bonus can be given to BRA & BRF
            const { determineAstrologySeason } = avCalc();
            adjResult.seasonalBonusElement =  determineAstrologySeason(adjResult.createdAt).element;

            res.formatter.ok({ result : adjResult }, 'Retrieved Latest Battle Results');
          }else{
            res.formatter.ok({ result : null }, 'Latest Report already viewed');
          }

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
    if(adjResult.outcome === 'Avatar Wins'){
      return Items.findAll({
        attributes: ['type','name','description','lore','effect1','effect2','icon','class','exhaustible','ptCost','action'],
        where : { action : { [Op.in] : adjResult.postBattleActions } }
      });
    }
  }).then((items) =>{
    adjResult.itemsAquired = items;

    // Figure out which season it is, so a 25% bonus can be given to BRA & BRF
    const { determineAstrologySeason } = avCalc();
    adjResult.seasonalBonusElement =  determineAstrologySeason(adjResult.createdAt).element;
  
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
      adjResult.seasonalBonusElement =  determineAstrologySeason(adjResult.createdAt).element;
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
            attributes: ['type','name','description','lore','effect1','effect2','icon','class','exhaustible','ptCost','action'],
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
router.post('/fetch-battles-won', body('avatarID').isNumeric(), authenticateJWT, (req, res) =>{
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


module.exports = router;