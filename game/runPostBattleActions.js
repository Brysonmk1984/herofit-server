const AvatarEquip = require('../db').AvatarEquip;
const { FOE_DIFFICULTY_XP_MOD_FACTOR, BXP_LEVEL_CURVE, BONUS_XP_EXPONENT, PT_EXPONENT } = require('./constants'); 
const ALLPBAs = require('./postBattleActions.json');
const ALLITEMS = require('./allItems.json');

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
  //const basePt = Math.pow(heroLevel, PT_EXPONENT);
  const basePt = 19;
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

    // Use the matchingPBA type and name to find the exact item referenced in the PBA
    const matchingItem = ALLITEMS[matchingPBA.itemCategory].find(item => item.name === matchingPBA.name);
    // remove ID, we use autoinc here
    delete matchingItem.id;
    //console.log('MATTCHITEM = ', matchingItem);
    //console.log('AVID = ', avatarID);
    const itemToInsert = Object.assign({}, matchingItem, { avatarID })
    // Push the ITEM that matches a PBA that matches the ACTION, along with the avatarID, into an array
    itemsToInsert.push(itemToInsert);
  });


  console.log('BULK CREATE - INSERT ITEMS -', itemsToInsert);
  // INSERT all the items from the itemsToInsert array, gathered from the PBAs
  return AvatarEquip.bulkCreate(itemsToInsert);

}

function doPostBattleEffects(avatar, foe, outcome){
  const fAbility = foe.ability;
  if(fAbility.type === 'post-battle'){
    switch(fAbility.name){
      //PLAGUEBRINGER
      case 'Infect':
        // Only apply Infect if the hero won or DRAW, otherwise he should just be knocked out
        if(outcome === 'Avatar Wins' || outcome === 'Draw'){
          const status = 'Infected';
          const statusFade = 12;

          return Object.assign({}, avatar, { status, statusFade });
        }
        return avatar;
      default:
        return;
    }
  }
  return avatar;
}

module.exports = { determineXpBounty, determinePtBounty, doAllPbas, doPostBattleEffects };