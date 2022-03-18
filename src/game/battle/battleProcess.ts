import { Avatar, AvatarItems, Items, Battle } from "../../config/db";
import doBattle from "./doBattle";
import preBattleSetup from "./preBattleSetup";
import postBattleProcess from "./postBattleProcess";
import { Op } from "sequelize";
import xpCalc from "../upgrades/xpCalc";
import { BattleHero, BattlePassiveAbility, GamePhase } from "../../types/BackendOnlyTypes";
import HF from "../../types/herofit";

/* 
  DEFAULT FUNCTION FOR SINGLE AND MULTIPLE BATTLES - Accepts the whole battle and avatar objects, returns the promise chain for updating Battle, Avatar, and AvatarItems
*/

function battleProcess(battleInstance: HF.Battle, avatarInstance: BattleHero, passiveAbility: BattlePassiveAbility) {
  const battle = Object.assign({}, battleInstance);
  let avatar = Object.assign({}, avatarInstance);

  const { determineBeginnersLuck, doScenarioAndBonus, doPreBattleEffects, doPreBattleHeroPassiveSetup, prepareFoe, applyElementalBonus, determineAggressor, applyCheat, getPreBattlePackage } = preBattleSetup(avatar, battle.foe);

  // Beginners luck Makes unfavorable scenarios and foe goesFirst less common for players below level 15
  determineBeginnersLuck();

  // PREBATTLE STEP 1 - RUN ANY PREBATTLE ABILITIES UNIQUE TO HEROES
  doPreBattleHeroPassiveSetup(passiveAbility);

  // PREBATTLE STEP 2 - ENCOUNTER SCENARIO IS DECIDED AND BONUSES GIVEN
  doScenarioAndBonus();

  // PREBATTLE STEP 3 - APPLY EFFECTS FROM ITEMS
  doPreBattleEffects(battle.effects);

  // PREBATTLE STEP 4 - APPLY FOE PREBATTLE ABILITY
  prepareFoe();

  // PREBATTLE STEP 5 - ADJUST THE SEASONAL ELEMENT ON BOTH FOE AND AVATAR
  applyElementalBonus();

  // PREBATTLE STEP 5 - DETERMINE WHO ATTACKS FIRST
  determineAggressor();

  // FOR TESTING PURPOSES - APPLY CHEAT
  // Avatar Power, Foe Power, Avatar Health, Foe Health, Avatar Earth, Foe Earth
  //applyCheat(1,1,1,1,10000,10000)
  //applyCheat(1000,50, 448,1)

  // PREBATTLE STEP 7 - GET FINAL AVATAR, FOE, AND WHO GOES FIRST FOR BATTLE
  const { BRA, BRF, goesFirst, scenario, effectProcs } = getPreBattlePackage();

  // BATTLE STEP - ALL ROUNDS RAN AND DAMAGE DEALT
  // BATTLE DETAILS RETURNED
  try {
    const battlePassive : BattlePassiveAbility = effectProcs.find(e => e.type === "battle") as BattlePassiveAbility;

    console.log('BP=', battlePassive);
    const b = doBattle(BRA, BRF, goesFirst, battlePassive);

    const { doPostBattleEffects, updateAvatarByOutcome, updateAvatarByLevelUp, doAllPbas, getPostBattlePackage } = postBattleProcess(BRA, BRF, b.outcomeData, b.aHealthRemaining, b.fHealthRemaining, passiveAbility);

    // POST BATTLE STEP 1 - POST BATTLE EFFECTS - If Any postbattle abilities or item effects exist, use them. These will often change the avatar status, health, and battle outcomes
    doPostBattleEffects(battle.effects);

    // POST BATTLE STEP 2
    updateAvatarByOutcome();

    // POST BATTLE STEP 4 - POST BATTLE ACTIONS - Post battle actions check if any actions were saved to the battle on goToBattle, and runs them now, usually for awarding items
    // DONE! - INSERT all the items from the itemNames array, gathered from the PBAs
    return doAllPbas(battle.postBattleActions)
      .then(itemNames => {
        //console.log('INSERTING = ', itemNames);
        return Items.findAll({
          where: { name: { [Op.in]: itemNames } },
          raw: true,
        });
      })
      .then(results => {
        const itemsToInsert = results.map(item => {
          return { avatarID: avatar.id, itemID: item.id };
        });
        return AvatarItems.bulkCreate(itemsToInsert);
      })
      .then(() => {
        const { postAv, postOutcome, xpGain, ptGain, postEffectProcs } = getPostBattlePackage();

        // Only save the relevant avatar changes, all come from postAv
        const { goToBattle, qp, health, maxHealth, power, status, statusFade, battleXP, battleWins, battleLosses, battleDraws, battleDkos, photonTokens } = postAv;
        // In case of Vampiric Touch, don't heal beyond what Avatar went into battle with
        const updatedHealth = health > avatar.health ? avatar.health : health;
        const avatarBattleUpdates = {
          goToBattle,
          health: updatedHealth,
          status,
          statusFade,
          battleXP,
          battleWins,
          battleLosses,
          battleDraws,
          battleDkos,
          photonTokens,
        };

        return Avatar.findOne({ where: { id: avatar.id }, raw: true }).then(latestSavedAv => {
          //console.log('in here', latestSavedAv);
          const { checkLevelUp } = xpCalc(latestSavedAv.activityXP, latestSavedAv.battleXP);
          // Check if level up from xp gain, adjust qp, maxHealth, power
          const { leveledUp, qpEarned, maxHealthEarned, powerEarned, aetherEarned } = checkLevelUp(xpGain);

          // Combine latest saved av with the updates from the latest battle. If avatar earned level up during battle, those values will be saved
          const combinedAv = leveledUp
            ? // If leveled up, check if hero was infected, if so, health shouldn't be set to full.
              Object.assign(
                {},
                latestSavedAv,
                avatarBattleUpdates,
                {
                  qp: latestSavedAv.qp + qpEarned,
                  power: latestSavedAv.power + powerEarned,
                  maxHealth: latestSavedAv.maxHealth + maxHealthEarned,
                  aether: latestSavedAv.aether + aetherEarned,
                },
                {
                  health: avatarBattleUpdates.status === "Infected" ? avatarBattleUpdates.health : latestSavedAv.maxHealth + maxHealthEarned,
                },
              )
            : Object.assign({}, latestSavedAv, avatarBattleUpdates);

          // Update Av first, then the battle record
          return Avatar.update(combinedAv, { where: { id: avatar.id } })
            .then(() => {
              // For displaying on the frontend, save regular prebattle effectProcs and postbattle effectprocs
              const combinedEffectProcs = [...effectProcs, ...postEffectProcs];

              return Battle.update(
                {
                  scenario: scenario.id,
                  outcome: postOutcome.outcome,
                  aStatus: postOutcome.avatarStatus,
                  xpGain,
                  ptGain,
                  leveledUp: leveledUp,
                  foe: battle.foe,
                  avatar,
                  bra: BRA,
                  brf: BRF,
                  roundBreakdown: b.roundBreakdown,
                  effectProcs: combinedEffectProcs.length ? combinedEffectProcs : null,
                },
                { where: { id: battle.id }, raw: true },
              );
            })
            .then(() => {
              return postOutcome.outcome;
            })
            .catch(error => {
              console.log("ERROR SOMEWHERE IN BATTLE PROCESS", error);
              return error;
            });
        });
      })
      .catch(error => {
        console.log("ERROR INSERTING ITEM", error);
      });
  } catch (error) {
    throw error;
  }
}

export default battleProcess;
