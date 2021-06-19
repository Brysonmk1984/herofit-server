const { AvatarItems } = require('../config/db');
const { FOE_DIFFICULTY_XP_MOD_FACTOR, BXP_LEVEL_CURVE, BONUS_XP_EXPONENT, PT_EXPONENT } = require('./CONSTANTS'); 
const ALLPBAs = require('./postBattleActions.json');
const { config } = require('../appConfig');
const { handleBoostXP, handleBoostPT } = require('./specialEvents/boosterActionHandlers');
const chance = require('chance')();

// XP GAIN FOR DEFEATING FOES
function determineXpBounty(baseOutcomeXp = 5, difficultyFactor = 0, heroLevel = 1, bonusXp = 0, foeType){
  //console.log('parameters-',baseOutcomeXp,difficultyFactor, heroLevel, bonusXp );

  // BASE OUTCOME XP + HERO LEVEL EXPONENT ADDITION
  const exponent = (1/BXP_LEVEL_CURVE);
  const xpGainBasedOnLevel = baseOutcomeXp + Math.pow(heroLevel, exponent);
  //console.log('hl-',heroLevel,'EX-',exponent,xpGainBasedOnLevel);
  // DIFFICULTY FACTOR SUBTRACTION (or addition in the future)
  const difficultyModMultiplier = xpGainBasedOnLevel * (difficultyFactor * FOE_DIFFICULTY_XP_MOD_FACTOR);
  
  // ADD the previous two values
  const afterModXpGain = Math.ceil(xpGainBasedOnLevel + difficultyModMultiplier);
  //console.log('xpbylevel', xpGainBasedOnLevel, 'difficultyModMultiplier', difficultyModMultiplier, 'aftermod', afterModXpGain);

  // ADD in any villain bonus, adjusted by hero level
  if(bonusXp){
    bonusXp =  bonusXp + Math.pow(heroLevel, BONUS_XP_EXPONENT);
  }
  //console.log('XPBonus - ',bonusXp);
  // Add bonus xp from previous step with xp from battle
  let finalXpGain = Math.floor(afterModXpGain + bonusXp);



  // ADD IN XP BONUS BOOSTER HERE FOR SEASONAL EVENTS
  const event = config.specialEvent;
  // If Special Event is live, run code to attempt any special foe events
  if(event){
    const xpBoosterAts = event.actionTypes.filter((at) => at.type === 'xpBooster');
    const listOfRequirements = xpBoosterAts.map(at => at.requirements).flat();
    const listOfPossibleFoes = listOfRequirements.map(req => req.foeType)
    const isAMatchingFoe = listOfPossibleFoes.includes(foeType);

    // If the event contains foeLikelihood actions
    if(xpBoosterAts.length && isAMatchingFoe){
      finalXpGain = handleBoostXP(xpBoosterAts, finalXpGain);
    }
  }

  // Return final result
  return finalXpGain;
}

// PHOTON TOKENS AWARDED FOR DEFEATING FOES
function determinePtBounty(heroLevel,bonusPt = 0, foeType){
  //const basePt = Math.pow(heroLevel, PT_EXPONENT);
  const basePt = 33;
  let randomModifier = Math.floor(Math.random() * 60) * .01;
  const positive = Math.floor(Math.random() * 2) === 1 ? true : false;
  const modifiedPt = positive ? basePt + (randomModifier * basePt) : basePt - (randomModifier * basePt) ;
  
  //console.log(basePt, modifiedPt);

  // ADD in any villain bonus, adjusted by hero level
  if(bonusPt){
    bonusPt =  bonusPt + Math.pow(heroLevel, PT_EXPONENT);
  }

  let finalPtGain = Math.floor(modifiedPt + bonusPt);


  // ADD IN PT BONUS BOOSTER HERE FOR SEASONAL EVENTS
  const event = config.specialEvent;
  // If Special Event is live, run code to attempt any special foe events
  if(event){
    const ptBoosterAts = event.actionTypes.filter((at) => at.type === 'ptBooster');
    const listOfRequirements = ptBoosterAts.map(at => at.requirements).flat();
    const listOfPossibleFoes = listOfRequirements.map(req => req.foeType)
    const isAMatchingFoe = listOfPossibleFoes.includes(foeType);
    // NEED TO MATCH foeType to possible foes in the ATs

    // If the event contains foeLikelihood actions
    if(ptBoosterAts.length && isAMatchingFoe){     
      console.log('PTGAIN before event -', finalPtGain);
      finalPtGain = handleBoostPT(ptBoosterAts, finalPtGain);
      console.log('PTGAIN after event -', finalPtGain);
    }
  }


  return finalPtGain;
}

// DO POST BATTLE ACTIONS




module.exports = { determineXpBounty, determinePtBounty };