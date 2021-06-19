const { Avatar, AvatarItems, Battle} = require('../../config/db');
const doBattle = require('./doBattle');
const preBattleSetup = require('./preBattleSetup');
const postBattleProcess = require('./postBattleProcess');

/* 
  DEFAULT FUNCTION FOR SINGLE AND MULTIPLE BATTLES - Accepts the whole battle and avatar objects, returns the promise chain for updating Battle, Avatar, and AvatarItems
*/

function battleProcess(battle, avatar){
  console.log('BATTLE', battle, avatar);
  const { determineBeginnersLuck, doScenarioAndBonus, doPreBattleEffects, prepareFoe, applyElementalBonus, determineAggressor, applyCheat, getPreBattlePackage } = preBattleSetup(avatar, battle.foe);

  // Beginners luck Makes unfavorable scenarios and foe goesFirst less common for players below level 15
  determineBeginnersLuck();
  

  // PREBATTLE STEP 1 - ENCOUNTER SCENARIO IS DECIDED AND BONUSES GIVEN
  doScenarioAndBonus();
  
  // PREBATTLE STEP 2 APPLY EFFECTS FROM ITEMS
  doPreBattleEffects(battle.effects);

  // PREBATTLE STEP 3 - APPLY FOE PREBATTLE ABILITY
  prepareFoe();
  
  // PREBATTLE STEP 4 - ADJUST THE SEASONAL ELEMENT ON BOTH FOE AND AVATAR
  applyElementalBonus();

  // PREBATTLE STEP 5 - DETERMINE WHO ATTACKS FIRST
  determineAggressor();

  // FOR TESTING PURPOSES - APPLY CHEAT
  //applyCheat(1000, 10)

  // PREBATTLE STEP 6 - GET FINAL AVATAR, FOE, AND WHO GOES FIRST FOR BATTLE
  const { BRA, BRF, goesFirst, scenario } = getPreBattlePackage();
  
  // BATTLE STEP - ALL ROUNDS RAN AND DAMAGE DEALT
  // BATTLE DETAILS RETURNED
  b = doBattle(BRA, BRF, goesFirst);

  const { doPostBattleEffects, updateAvatarByOutcome, updateAvatarByLevelUp, doAllPbas, getPostBattlePackage } =  postBattleProcess(BRA, BRF, b.outcomeData, b.aHealthRemaining);

  // POST BATTLE STEP 1 - POST BATTLE EFFECTS - If Any postbattle abilities or item effects exist, use them. These will often change the avatar status, health, and battle outcomes
  doPostBattleEffects();

  // POST BATTLE STEP 2
  updateAvatarByOutcome();

  // POST BATTLE STEP 3 - adjust avatar xp & qp based on level up from battle
  updateAvatarByLevelUp();

  // POST BATTLE STEP 4 - POST BATTLE ACTIONS - Post battle actions check if any actions were saved to the battle on goToBattle, and runs them now, usually for awarding items
  const itemsToInsert = doAllPbas(battle.postBattleActions);
  console.log('ITEMS TO INSERT', itemsToInsert);
  // DONE! - INSERT all the items from the itemsToInsert array, gathered from the PBAs
  // NESTED TRANSACTION
  return AvatarItems.bulkCreate(itemsToInsert)
  .then(() =>{
    const { postAv, postOutcome, xpGain, ptGain } = getPostBattlePackage();
    // Only save the relevant avatar changes, all come from postAv
    const { goToBattle, qp, health, status, statusFade, battleXP, battleWins, battleLosses, battleDraws, battleDkos, photonTokens } = postAv;
    const avatarUpdates = { goToBattle, qp, health, status, statusFade, battleXP, battleWins, battleLosses, battleDraws, battleDkos, photonTokens};

    // Update Av first, then the battle record
    return Avatar.update(avatarUpdates, { where: { id: avatar.id } })
    .then(() =>{
    
      return Battle.update({
        scenario : scenario.id,
        outcome : postOutcome.outcome,
        aStatus : postOutcome.avatarStatus,
        aPhyDamage : b.aPhyDamage,
        fPhyReduction : b.fPhyReduction,
        fPhyDamage : b.fPhyDamage,
        aPhyReduction : b.aPhyReduction,
        xpGain,
        ptGain,
        leveledUp : leveledUp,
        aHealthRemaining : b.aHealthRemaining,
        fHealthRemaining : b.fHealthRemaining,
        foe : battle.foe,
        avatar,
        bra : BRA,
        brf : BRF,
        aElmDamage : b.aElmDamage,
        fElmReduction : b.fElmReduction,
        fElmDamage : b.fElmDamage,
        aElmReduction : b.aElmReduction,
        roundBreakdown : b.roundBreakdown
      },
      { where: { id: battle.id }, raw : true }
      );
    }).catch((error) =>{
      console.log('ERROR SOMEWHERE IN BATTLE PROCESS', error);
      return error;
    });
  });
}

module.exports = battleProcess;