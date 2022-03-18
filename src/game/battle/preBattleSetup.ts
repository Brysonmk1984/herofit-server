import { BEGINNERS_LUCK_MAX_XP, BEGINNERS_LUCK_LIKELIHOOD } from "../CONSTANTS";
import { determineScenario, calcScenarioBonuses } from "./scenario";
import { doAvatarBattlePrep, doFoeBattlePrep, doHeroPassiveAbilities } from "./doBattlePrep";
import { parseStats } from "../../lib/helperFunctions";
import avCalc from "../upgrades/avCalc";
import { AvatarOrFoeString, BackendEffectProcs, BattleElements, BattleFoe, BattleHero, PassiveAbility, Scenario } from "../../types/BackendOnlyTypes";
import Chance from "chance";
const chance = Chance();

const preBattleSetup = function (avatar: BattleHero, foe: BattleFoe) {
  let a = Object.assign({}, avatar);
  let f = Object.assign({}, foe);
  let beginnersLuck: boolean;
  let scenario: Scenario;
  let goesFirst: AvatarOrFoeString;

  // Only used to help determine Ninja passive
  let possibleAbilityProcs: string[] = [];

  // Only appears on Battle Report, no other uses
  let effectProcs: BackendEffectProcs[] = [];

  return {
    determineBeginnersLuck: () => {
      const tXP = a.activityXP + a.battleXP;
      if (tXP < BEGINNERS_LUCK_MAX_XP) {
        beginnersLuck = chance.bool({ likelihood: BEGINNERS_LUCK_LIKELIHOOD });
      }
      beginnersLuck = false;
    },
    // Only Applies to Natural Ninja and Empath
    doPreBattleHeroPassiveSetup: (passiveAbility: PassiveAbility) => {
      ({ avatar: a, pAbilityProcs: possibleAbilityProcs, eProcs: effectProcs } = doHeroPassiveAbilities(a, possibleAbilityProcs, effectProcs, passiveAbility));
    },
    // Choose scenario then apply bonuses to Avatar & Foe. Return Avatar, Foe, and Scenario
    doScenarioAndBonus: () => {
      const scenarioZeroBoost = possibleAbilityProcs.includes("Naturally Stealthy") ? true : false;

      ({ s: scenario, ep: effectProcs } = determineScenario(beginnersLuck, scenarioZeroBoost, effectProcs));

      // assign 'a' variable above the value of sAvatar, same with 'f'
      ({ sAvatar: a, sFoe: f } = calcScenarioBonuses(a, f, scenario));
    },
    doPreBattleEffects: (effects: string[]) => {
      // If there are any effects, find 'prebattle' effects and adjust avatar accordingly
      if (effects && effects.length) {
        let procs: BackendEffectProcs[] = [];
        // Buff or debuff hero and foe based on item effects
        // If new item effects are added, they need to be added in this function:
        ({ avatar: a, foe: f, procs } = doAvatarBattlePrep(a, f, effects, scenario.id));
        effectProcs = [...effectProcs, ...procs];
      }
    },
    prepareFoe: () => {
      let procs: BackendEffectProcs[] = [];
      ({ avatar: a, foe: f, procs } = doFoeBattlePrep(a, f, scenario.id));

      effectProcs = [...effectProcs, ...procs];
    },
    applyElementalBonus: () => {
      // Figure out which season it is, so a 25% bonus can be given to a & f
      const { determineAstrologySeason } = avCalc();
      const { element } = determineAstrologySeason(Date.now().toString());
      const seasonalBonusElement = element.toLowerCase();
      a[seasonalBonusElement as keyof BattleElements] *= 1.25;
      f[seasonalBonusElement as keyof BattleElements] *= 1.25;
    },
    determineAggressor: () => {
      if (scenario.id === 0) {
        goesFirst = "Avatar";
      } else if (scenario.id === 3) {
        goesFirst = "Foe";
      } else {
        // 66% Chance the Avatar will go first if below level 15
        if (beginnersLuck) {
          goesFirst = "Avatar";
        } else {
          // randomly decide
          const avIsFirst = chance.bool({ likelihood: 50 });
          goesFirst = avIsFirst ? "Avatar" : "Foe";
        }
      }
    },
    applyCheat: (avPowerBoost = 1, foePowerBoost = 1, avHealthBoost = 1, foeHealthBoost = 1, avatarEarthBoost = 1, foeEarthBoost = 1) => {
      a.power = avPowerBoost;
      f.power = foePowerBoost;
      a.health = avHealthBoost;
      f.health = foeHealthBoost;
      a.earth = avatarEarthBoost;
      f.earth = foeEarthBoost;
    },
    getPreBattlePackage: () => ({
      BRA: parseStats(a, true),
      BRF: parseStats(f, true),
      goesFirst,
      scenario,
      effectProcs,
    }),
  };
};

export default preBattleSetup;
