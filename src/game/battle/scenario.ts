import { BackendEffectProcs, BattleHero, Scenario } from "../../types/BackendOnlyTypes";
import HF from "../../types/herofit";
import { BATTLE_SCENARIOS, NATURALLY_STEALTHY_CHANCE } from "../CONSTANTS";
import Chance from "chance";
const chance = Chance();

// Calculates the bonus to both Avatar and Foe depending on scenario
function calcScenarioBonuses(avatar: BattleHero, foe: HF.BattleFoe, scenario: Scenario) {
  const ap = avatar.power;
  const ah = avatar.health;

  const fp = foe.power;
  const fh = foe.health;

  avatar.power = ap + ap * scenario.avatarPowerMod;
  avatar.health = ah + ah * scenario.avatarHealthMod;

  foe.power = fp + fp * scenario.foePowerMod;
  foe.health = fh + fh * scenario.foeHealthMod;

  return { sAvatar: avatar, sFoe: foe };
}

// Determines which of the 6 scenarios are going to be the stage for battle, chosen at random
function determineScenario(beginnersLuck: boolean, scenarioZeroBoost?: boolean, effectProcs: BackendEffectProcs[] = []) {
  // Currently, only used for Ninja passive ability
  if (scenarioZeroBoost) {
    const naturallyStealthy = chance.bool({ likelihood: NATURALLY_STEALTHY_CHANCE });
    if (naturallyStealthy) {
      return { s: BATTLE_SCENARIOS[0], ep: [...effectProcs, { effect: "Naturally Stealthy", type: "prebattle" }] };
    }
  }

  // If beginners luck, only choose from favorable or neutral scenarios
  if (beginnersLuck) {
    const positiveScenarios = [0, 2, 4, 5];
    const scenarioIndex = positiveScenarios[Math.floor(Math.random() * positiveScenarios.length)];
    return { s: BATTLE_SCENARIOS[scenarioIndex], ep: effectProcs };
  }

  // Randomly pick a scenario
  return { s: BATTLE_SCENARIOS[Math.floor(Math.random() * BATTLE_SCENARIOS.length)], ep: effectProcs };
}

export { calcScenarioBonuses, determineScenario };
