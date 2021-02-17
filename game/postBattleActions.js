const Avatar = require('../db').Avatar;
const Battle = require('../db').Battle;
const AvatarEquip = require('../db').AvatarEquip;
const { FOE_DIFFICULTY_XP_MOD_FACTOR, BXP_LEVEL_CURVE, BONUS_XP_EXPONENT, PT_EXPONENT } = require('./constants'); 
const { Op } = require("sequelize");
const ACTIONS = require('./postBattleActions.json');
const VILLAINS = require('../game/villains.json');
const { DEFEATEDFOE, WINSTREAK, WINTOTAL } = require('../game/postBattleActions.json');

// XP GAIN FOR DEFEATING FOES
function determineXpBounty(baseOutcomeXp = 5, difficultyFactor = 0, heroLevel = 1, bonusXp = 0){
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
function determinePtBounty(heroLevel,bonusPt = 0){
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
  const PBAs = [];
 
  return AvatarEquip.findAll({
    attributes : ["id", "avatarID", "type", "name"],
    where : { type : 'title', avatarID : avatar.id }
  }).then((titles) =>{console.log('TTTs', titles);
    const titleNamesArray = titles.map(title => title.name);
    //console.log('TNA - ', titleNamesArray);
    const allPbaCheckPromises = [];
   
    // Win Totals Check
    allPbaCheckPromises.push(_checkWinTotal(avatar.id));

    // Win streak Check
    allPbaCheckPromises.push(_checkWinStreak(avatar.id, titleNamesArray));


    // Spirits get a skin if they defeat all of a particular type
    if(foe.class === 'Spirits'){console.log('here');
      // Check if current foe is last of type of foe
      allPbaCheckPromises.push(_checkDefeatedAllOfTypeButCurrent(avatar.id, foe.type, 'Spirits', foe.name));
    }


    return Promise.allSettled(allPbaCheckPromises)
    .then((resolvedPromises)=>{
      const totalCheck = resolvedPromises[0];
      const streakCheck = resolvedPromises[1];
      const defeatFoeCheck = resolvedPromises[2];
      console.log('RP - ', totalCheck, streakCheck, defeatFoeCheck);
      
      // results from resolved promises
      const winTotalAction = totalCheck ? totalCheck.value : null;
      const winStreakAction = streakCheck ? streakCheck.value : null;
      const defeatFoeAction = defeatFoeCheck ? defeatFoeCheck.value : null;

      
      // 1 - WIN TOTAL AWARD PBA
      if(winTotalAction){
        PBAs.push(winTotalAction);
      }

      // 2 - STREAK TITLE AWARD PBA
      if(winStreakAction){
        PBAs.push(winStreakAction);
      }

      // 3 - SKIN AWARD PBA
      if(defeatFoeAction){
        PBAs.push(defeatFoeAction);
      }


      // ALL PBAs as action strings in an array
      console.log('PBA-ACTION-ARRAY - ', PBAs);
      resolve(PBAs);

    }).catch((err)=> {
      console.log('err', err)
      reject(err);
    });



  }).catch((error) => console.log('Error Getting all titles', error));
  

}

// CHECKS IF THE CURRENT FOE WILL GRANT A NEW SKIN FOR BEING LAST OF TYPE
function _checkDefeatedAllOfTypeButCurrent(avatarId, foeType, foeClass, currentFoeName){
  // FIND ALL BATTLES WHERE THE AVATAR WON AND WHERE THE FOE MATCHES THE FOETYPE PASSED IN
  return Battle.findAll({
    attributes : ["foe"],
    where : {  avatarID : avatarId, outcome : "Avatar Wins",  "foe.type" : { [Op.eq] : foeType  }},
    raw : true 
  }).then((results) =>{
    // All foes defeated within a type (eg. Banshee)
    if(results){
      // From resulting battles, make an array that's only the names of the foes. Then sort it in alphabetical order
      const foesDefeated = results.map(result => {
        // Need to check for Shadow-Self instead of Shadow-Grabbler
        const foeName = result.foe.type === 'Shadow-Self' ? 'Shadow-Self' : result.foe.name;
        return foeName;
      }).slice().sort();
      // Remove duplicates from foesDefeated
      const fdNoDUpes = [...new Set(foesDefeated)];
      //console.log('FD - ', fdNoDUpes);
      // All foes of a certain type
      const allFoes = VILLAINS[foeClass].find(foe => foe.type === foeType).foe.slice().sort();
      //console.log('AF',allFoes);
      
      // IF THERE IS ONLY ONE NAME MISSING FROM allFoes AND ITS THE CURRENT FOE
      // GOAL of this code is to determine if this exact foe name is the final name of a type that HAS NOT been defeated
      // IF SO, we want to assign a postBattleAction that will award the user if they win the battle


      // Make an array of all foes of type EXCLUDING the name of the current foe
      const allFoesMinusCurrent = allFoes.filter(foe => foe !== currentFoeName);
      console.log('AFMC', allFoesMinusCurrent);
      console.log('the two arrays',allFoesMinusCurrent, fdNoDUpes);
      // Compare the previous array to the deduped foes defeated array
      const isLastOfType = allFoesMinusCurrent.every((val, i) => val === fdNoDUpes[i]);
     
      // If last foe of type, return matching PBA action
      if(isLastOfType){
        // Consider moving the PBA action to the normal PBA JSON file
        const matchingPBAAction = VILLAINS['Spirits'].find(f => f.type === foeType).pba[0];
        return matchingPBAAction;
      }
      return undefined;
    }
    // THIS SHOULDN'T HAPPEN, BUT I WANT TO PREVENT THE SCRIPT FROM STALLING IF IT DOES
    return undefined;
  }).catch((error)=>{
    console.log('ERR - ', error);
  });
}

// CHECKS FOR WIN STREAK
function _checkWinStreak(avatarId, titleNamesArray){

  // Get latest 35 battles
  return Battle.findAll({
    attributes : ["outcome"],
    where : {  avatarID : avatarId, outcome : { [Op.ne] : "TBD" } },
    limit : 35,
    order : [['createdAt','DESC']],
    raw : true 
  }).then((results) =>{
    let streak = 0;
    for(let i = 0; i < results.length; i++){
      if(results[i].outcome === 'Avatar Wins'){
        streak += 1;
      }else{
        break;
      }
    }

    // Current streak that Avatar will have if it wins tonight
    const streakIfWin = streak + 2;

    // Need to find the streak that matches a pba requirement, if one exists
    const matchingPBA = WINSTREAK.find(pba => pba.requirement === streakIfWin);

    // If win matches a possible critical win default
    if(matchingPBA){
      // Win is critical if it's unearned
      const isCriticalWin = !titleNamesArray.includes(matchingPBA.name);

      //Add to PBAs if critical
      if(isCriticalWin){
        return matchingPBA.action;
      }
    }

  }).catch((error)=>{
    console.log('Error getting win streak - ', error);
  });

}

// CHECKS FOR WIN TOTAL
function _checkWinTotal(avatarId){
  return Avatar.find({
    attributes : ['battleWins'],
    where : { id : avatarId },
    raw : true
  }).then(({ battleWins }) =>{
    const battleWinsIfWinTonight = battleWins + 7;
    // Check if the potential win total will match a new PBA
    const matchingPBA = WINTOTAL.find(pba => pba.requirement === battleWinsIfWinTonight);

    if(matchingPBA){
      return matchingPBA.action;
    }
  }).catch((error)=>{
    console.log('Error getting battle wins - ', error);
  });
}


module.exports = { determineXpBounty, determinePtBounty, doPostBattleActions, determinePostBattleActions };