const Battle = require('../db').Battle;
const AvatarEquip = require('../db').AvatarEquip;
const { FOE_DIFFICULTY_XP_MOD_FACTOR, BXP_LEVEL_CURVE, BONUS_XP_EXPONENT, PT_EXPONENT } = require('./constants'); 
const { Op } = require("sequelize");
const ACTIONS = require('./postBattleActions.json');
const VILLAINS = require('../game/villains.json');
const ALLPBAS = require('../game/postBattleActions.json');

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
  // Figure out how to handle foe classes here DONE
  // Get all battles by player - DONE
  // Filter battles by foe type to see if they have defeated DONE
  // Figure out if critical opponent (last one left in a group) - DONE
  // Check for win streak - DONE
  // Check to make sure Shadow-Self is working correctly - DONE
  // Add all PBAs to battle



  return AvatarEquip.findAll({
    attributes : ["id","avatarID", "type","name"],
    where : { type : 'title', avatarID : avatar.id }
  }).then((titles) =>{
    const titleNamesArray = titles.map(title => title.name);
    console.log('TNA - ', titleNamesArray);
    const allPbaCheckPromises = [];

    allPbaCheckPromises.push(_checkWinStreak(avatar.id));
    // Check if on a win streak, and if on the verge of a new  streak award
    _checkWinStreak(avatar.id);
    console.log('FFOE', foe);
    // Spirits get a skin if they defeat all of a particular type
    if(foe.class === 'Spirits'){console.log('here');
      // Check if current foe is last of type of foe
      allPbaCheckPromises.push(_checkDefeatedAllOfTypeButCurrent(avatar.id, foe.type, 'Spirits', foe.name));
    }


    return Promise.allSettled(allPbaCheckPromises)
    .then((resolvedPromises)=>{
      const streakCheck = resolvedPromises[0];
      const criticalFoeCheck = resolvedPromises[1];
      console.log('RP - ', streakCheck, criticalFoeCheck);
      
      // results from resolved promises
      const streakIfWin = streakCheck.value;
      const isLastOfType = criticalFoeCheck && criticalFoeCheck.value;

      
      // TITLE AWARD PBA
      const namesOfStreakTitles = { 3 : 'Adept', 5 : 'Warrior', 10 : 'Untouchable', 20 : 'Dominator', 35 : 'Legendary' };
      const criticalWinCounts = [3,5,10,20,35];
      const isMatchingWin = criticalWinCounts.includes(streakIfWin);
      // If win matches a possible critical win default
      if(isMatchingWin){
        // Win is critical if it's unearned and mapped in namesOfStreakTitles
        const unearnedTitle = !titleNamesArray.includes(namesOfStreakTitles[streakIfWin]);
        const isCriticalWin = namesOfStreakTitles[streakIfWin] && unearnedTitle;
        //Add to PBAs if critical
        if(isCriticalWin){
          const pbaToPush = ALLPBAS.find(pba => pba.requirement === streakIfWin).action;
          PBAs.push(pbaToPush);
        }
      }

      // SKIN AWARD PBA
      if(isLastOfType){
        const pbaToPush = VILLAINS['Spirits'].find(f => f.type === foe.type).pba;
        // Theere's an array of PBAs associated with foes. For now, we're only needing the first, which grants a skin for beating all names of a specific type
        PBAs.push(pbaToPush[0]);
      }
      console.log('PBBB', PBAs);
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
      const afmcMatchesFd = allFoesMinusCurrent.every((val, i) => val === fdNoDUpes[i]);
      // If match return true, otherwisefalse
      return afmcMatchesFd;
    }
    // THIS SHOULDN'T HAPPEN, BUT I WANT TO PREVENT THE SCRIPT FROM STALLING IF IT DOES
    return false;
  }).catch((error)=>{
    console.log('ERR - ', error);
  });
}

// CHECKS FOR WIN STREAK AND IF IT'S A CRITICAL WIN
function _checkWinStreak(avatarId){

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

    // Return current streak that Avatar will have if it wins tonight
    return streak + 1;

  }).catch((error)=>{
    console.log('ERR - ', error);
  });

}


module.exports = { determineXpBounty, determinePtBounty, doPostBattleActions, determinePostBattleActions };