const Battle = require('../db').Battle;
const { FOE_DIFFICULTY_XP_MOD_FACTOR, BXP_LEVEL_CURVE, BONUS_XP_EXPONENT, PT_EXPONENT } = require('./constants'); 
const { Op } = require("sequelize");
const ACTIONS = require('./postBattleActions.json');
const VILLAINS = require('../game/villains.json');

// XP GAIN FOR DEFEATING FOES
function determineXpGain(baseOutcomeXp = 5, difficultyFactor = 0, heroLevel = 1, bonusXp = 0){
  console.log('parameters-',baseOutcomeXp,difficultyFactor, heroLevel, bonusXp );

  // BASE OUTCOME XP + HERO LEVEL EXPONENT ADDITION
  const exponent = (1/BXP_LEVEL_CURVE);
  const xpGainBasedOnLevel = baseOutcomeXp + Math.pow(heroLevel, exponent);
  console.log('hl-',heroLevel,'EX-',exponent,xpGainBasedOnLevel);
  // DIFFICULTY FACTOR SUBTRACTION (or addition in the future)
  const difficultyModMultiplier = xpGainBasedOnLevel * (difficultyFactor * FOE_DIFFICULTY_XP_MOD_FACTOR);
  
  // ADD the previous two values
  const afterModXpGain = Math.ceil(xpGainBasedOnLevel + difficultyModMultiplier);
  console.log('xpbylevel', xpGainBasedOnLevel, 'difficultyModMultiplier', difficultyModMultiplier, 'aftermod', afterModXpGain);

  // ADD in any villain bonus, adjusted by hero level
  if(bonusXp){
    bonusXp =  bonusXp + Math.pow(heroLevel, BONUS_XP_EXPONENT);
  }
  console.log('XPBonus - ',bonusXp);
  // Add bonus xp from previous step with xp from battle
  const finalXpGain = Math.floor(afterModXpGain + bonusXp);

  // Return final result
  return finalXpGain;
}

// PHOTON TOKENS AWARDED FOR DEFEATING FOES
function determinePtGain(heroLevel,bonusPt = 0){
  const basePt = Math.pow(heroLevel, PT_EXPONENT);
  let randomModifier = Math.floor(Math.random() * 60) * .01;
  const positive = Math.floor(Math.random() * 2) === 1 ? true : false;
  const modifiedPt = positive ? basePt + (randomModifier * basePt) : basePt - (randomModifier * basePt) ;
  
  console.log(basePt, modifiedPt);

  // ADD in any villain bonus, adjusted by hero level
  if(bonusPt){
    bonusPt =  bonusPt + Math.pow(heroLevel, PT_EXPONENT);
  }

  const finalPtGain = Math.floor(modifiedPt + bonusPt);

  return finalPtGain;
}

// DO POST BATTLE ACTIONS
function doPostBattleActions(actions){
  console.log('ACTIONS - ', actions);
}

// ON GOTOBATTLE, DETERMINE POST BATTLE ACTIONS
function determinePostBattleActions(avatar, foe, resolve, reject){
  console.log('av', avatar, 'foe', foe);
  

  // Get all battles by player - DONE
  // Filter battles by foe type to see if they have defeated DONE
  // Check for win streak 
  // Check if foe type matches a switch for Boss fights






  _checkDefeatedAllOfType(avatar.id, foe.type, 'Spirits')
  .then((data)=>{
    console.log('DFA - ', data);
  }).catch((err)=> console.log('err', err));

  _checkWinStreak(avatar.id).then((data)=>{
    console.log('WS - ', data);
  }).catch((err)=> console.log('err', err));

}

function _checkDefeatedAllOfType(avatarId, foeType, foeClass){
  console.log('checking!', avatarId);
  
  // FIND ALL BATTLES WHERE THE AVATAR WON AND WHERE THE FOE MATCHES THE FOETYPE PASSED IN
  return Battle.findAll({
    attributes : ["foe"],
    where : {  avatarID : avatarId, outcome : "Avatar Wins",  "foe.type" : { [Op.eq] : foeType  }},
    raw : true 
  }).then((results) =>{
    // All foes defeated within a type (eg. Banshee)
    if(results){
      // From resulting battles, make an array that's only the names of the foes. Then sort it in alphabetical order
      const foesDefeated = results.map(result => result.foe.name).slice().sort();
      // Remove duplicates from foesDefeated
      const fdNoDUpes = [...new Set(foesDefeated)];
      console.log('FD - ', fdNoDUpes);
      // All foes of a certain type
      const allFoes = VILLAINS[foeClass].find(foe => foe.type === foeType).foe.slice().sort();
      console.log(allFoes);
      // compare every item and return true if the two arrays match, which means all foes of a type have been defeated
      const isEqual = allFoes.every((val, i) => val === fdNoDUpes[i])
      console.log('is equla', isEqual);
      return isEqual;
    }else{
      return false;
    }
   
    
  }).catch((error)=>{
    console.log('ERR - ', error);
  });
}

function _checkWinStreak(avatarId){
  
  return Battle.findAll({
    attributes : ["outcome"],
    where : {  avatarID : avatarId, outcome : { [Op.ne] : "TBD" } },
    limit : 25,
    order : [['createdAt','DESC']],
    raw : true 
  }).then((results) =>{
    console.log('REZ', results);
    let streak = 0;
    for(let i = 0; i < results.length; i++){
      if(results[i].outcome === 'Avatar Wins'){
        streak += 1;
      }else{
        break;
      }
    }
    console.log('ST', streak);
      
  }).catch((error)=>{
    console.log('ERR - ', error);
  });

}


module.exports = { determineXpGain, determinePtGain, doPostBattleActions, determinePostBattleActions };