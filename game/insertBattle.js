const { Op } = require("sequelize");
const { Avatar, Battle, Items } = require('../config/db');
const { determineItemEffects, determinePostBattleActions } = require('../game/onGoToBattle');
const { determineFoeWithStats } = require('./foeFunctions');
const ALLPBAs = require('../game/postBattleActions.json');

// Used for inserting a battle for an individual user
function insertBattle(avatar, foe){
  const foeWithStats = determineFoeWithStats(avatar, foe);

  
  let postBattleActions;
  // PROMISE - need to determine previous battles.
  return new Promise((resolve, reject) =>{
    return determinePostBattleActions(avatar, foeWithStats, resolve, reject);
  }).then((pbas) =>{
    // Need parent context;
    postBattleActions = pbas.length ? pbas : null;
    console.log('PBAS on insert = ', postBattleActions);
    const battleObj = {
        owner: avatar.owner,
        avatarID: avatar.id,
        avatarName: avatar.name,
        foe : foeWithStats,
        outcome: "TBD",
        seenReport : false,
    };
  
    // If there's postBattleActions, add them to initial battle record
    if(postBattleActions){
      battleObj.postBattleActions = postBattleActions;
    }
    console.log('Battle obj-', battleObj);
    // Determine item effects that will impact the battle
    const itemBattleEffects = determineItemEffects(avatar.equipped);
  
    console.log('IBE - ', itemBattleEffects);
    // If there are item effects that will impact battle, add them to initial battle record
    if(itemBattleEffects.length){
      battleObj.effects = itemBattleEffects;
    }
  
    return Battle.create(battleObj, {raw : true});
  }).then(() =>{
    return Avatar.update({ 
      goToBattle : true,
    },{ where: { owner: avatar.owner }, raw: true })
  }).then((result) =>{console.log('UPDATED AV GOTOBATTLE', result);
    // SHOULD NEVER HAPPEN
    if(!result){ console.log('THIS ERROR SHOULD NEVER HAPPEN');
      const error =  new Error(`No Avatar associated with user ${avatar.owner}`);
      res.formatter.serverError(error, 'Attempted to update Avatar goToBattle status but no results');
    }
  
    // Get the items acquired from the action types in the battle report
    let rewards = null;
    if(postBattleActions){
      rewards = postBattleActions.map(action => {
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
    }

    if(rewards){
      return Items.findAll({
        attributes: ['type','name','description','lore','effects','icon','class','exhaustible','ptCost','action'],
        where : { id : { [Op.in] : rewards }}
      }).then((matchingItems) =>{
        return {
          goToBattle : true,
          foe : foeWithStats,
          rewards : matchingItems
        };
      }).catch((error) =>{
        return error;
      });
    }else{
      return {
        goToBattle : true,
        foe : foeWithStats,
        rewards
      };
    }
  
  }).catch((error)=>{
    error = error.toString();
    console.log(`Couldn't Send Avatar to battle: ${error}`);
    return error;
  });
}

module.exports = insertBattle;
