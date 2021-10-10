const express = require('express');
const { body, validationResult, oneOf } = require('express-validator');
const { authenticateJWT } = require('../jwt/validateJWT');
const router = express.Router(); 
const { Op, col, fn, or } = require("sequelize");
const { Avatar, AvatarItems, Battle, Items } = require('../config/db');
const villains = require('../game/villains.json');
const avCalc = require('../game/upgrades/avCalc');
const moment = require('moment');
const ALLPBAs = require('../game/postBattleActions.json');
const instantiateBattle = require('../game/prebattle/instantiateBattle');
const battleProcess = require('../game/battle/battleProcess');

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
router.post('/fetch-battle-report', oneOf([body('avatarID').isNumeric().optional({nullable: true, checkFalsy: true}), body('owner').isEmail().optional({nullable: true, checkFalsy: true})]), authenticateJWT, (req, res) =>{
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    return res.formatter.badRequest(errors.array(), "Validation Error - POST /fetch-battle-report");
  }

  // Can now get latest BR by either avatarID or email(owner)
  const { avatarID, owner } = req.body;
  const column = avatarID ? "avatarID" : "owner";

  Battle.findAll({
    limit: 1,
    where: { 
      [column]: req.body[column],
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
          adjResult.itemsAcquired = items;
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
    adjResult.itemsAcquired = items;
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

          return matchingPBA.name;
        });
        if(rewards.length){
          Items.findAll({
            attributes: ['type','name','description','lore','effects','icon','class','exhaustible','ptCost','action'],
            where : { name : { [Op.in] : rewards }}
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
      console.log(`COULDNT FIND BATTLE, maybe it already ran? ${avatarID}`, battle);

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

// Runs one specific battle... currently only used if a battle fails
router.post('/run-specific-battle', body('avatarID').isNumeric(), authenticateJWT, (req, res) => {
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    return res.formatter.badRequest(errors.array(), "Validation Error - POST /run-specific-battle");
  }

  let { avatarID } = req.body;
  return Battle.findOne({ where: { outcome : 'TBD', avatarID }, raw : true })
  .then((battle) =>{
    if(!battle){
      throw new Error('No Battle')
    }else{
      return battleProcess(battle, battle.avatar);
    }

  }).then((data) =>{
    console.log('ran single battle - ', data);
    res.formatter.ok(data);
  }).catch((error) =>{
    if(error.toString() === 'Error: No Battle'){
      return res.formatter.badRequest(errors.array(), `No TBD battle matching avatarID ${avatarID} - POST /run-specific-battle`);
    }
    res.formatter.serverError(error.toString(), 'Retrieved Data Error for /run-specific-battle');
  });
});

/*
  MIGRATION
*/

// modify each battle that has "effects" and map the arrays to be just effect names
router.get('/change-effects-entries', (req, res) => {
  Battle.findAll(
    {
      attributes : ["id", "effects"],
      where:{ effects : {[Op.ne]: null} }, raw : true
    }
  ).then((results)=> {
    const idArray = results.map(result => result.id);
    const effectsArray = results.map(result => result.effects.map(effect => effect.name));
    console.log(idArray,effectsArray);

    const promiseArr=[];

    for(let i=0; i< idArray.length; i++){
      promiseArr.push(
        Battle.update(
          {effects : effectsArray[i]  },
          {where:{ id : idArray[i] }, raw : true}
        )  
      )
    }
    return Promise.all(promiseArr)

  }).then((results) =>{

    res.formatter.ok(results);
  }).catch((error) =>{
    res.formatter.serverError(error.toString());
  });
});




// modify each battle that has "effects" and map the arrays to be just effect names
// router.get('/change-effects-entries', (req, res) => {
//   Battle.update(
//     {effects : col('effects').map(effect => effect.name)  },
//     {where:{ effects : {[Op.ne]: null} }, raw : true}
//   ).then((results)=> {
//     console.log(results);
//     res.formatter.ok(results);
//   }).catch((error) =>{
//     res.formatter.serverError(error.toString());
//   });
// });




module.exports = router;