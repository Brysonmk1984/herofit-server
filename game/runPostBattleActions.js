const AvatarEquip = require('../db').AvatarEquip;
const { FOE_DIFFICULTY_XP_MOD_FACTOR, BXP_LEVEL_CURVE, BONUS_XP_EXPONENT, PT_EXPONENT } = require('./constants'); 
const ALLPBAs = require('./postBattleActions.json');

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
function doAllPbas(avatarID, postBattleActions){
  console.log('Running these PBAs - ', postBattleActions, 'for Avatar -', avatarID);

  const itemTypeMap = {'Award Skin' : 'skin','Award Title' : 'title','Award Pet' : 'pet'} 
  const pbaArray = [];
  
  // ALL PBAs FROM BATTLE
  postBattleActions.forEach((ACTION, i)=>{
    let matchingPBA;
    // FOR EACH ACTION TYPE WITHIN THE postBattleActions JSON file.
    for(let actionType in ALLPBAs){
      let matching = ALLPBAs[actionType].find(pba => pba.action === ACTION);
      if(matching){
        matchingPBA = matching;
        break;
      }
    }
    pbaArray.push(matchingPBA);
  });

  //console.log('PBA array after loop, just before insertion - ', pbaArray);
  //console.log('AVID - ', avatarID);
  const pbaToInserts = pbaArray.map(pba => {
    return {
      avatarID,
      type : itemTypeMap[pba.type],
      name : pba.name,
      description : pba.description,
      lore : pba.lore || null,
      effect1 : pba.effect1 || null,
      effec2 : pba.effect2 || null,
      icon : pba.icon || null,
      class : pba.class || null,
      equipped : false
    }
  });
  //console.log('BULK CREATE - INSERTPBAS-', pbaToInserts);
  return AvatarEquip.bulkCreate(pbaToInserts);

}

module.exports = { determineXpBounty, determinePtBounty, doAllPbas };