const { BEGINNERS_LUCK_MAX_XP, BEGINNERS_LUCK_LIKELIHOOD } = require("../CONSTANTS");
const { determineScenario, calcScenarioBonuses } = require("./scenario");
const { doAvatarBattlePrep, doFoeBattlePrep } = require("./doBattlePrep");
const avCalc = require("../upgrades/avCalc");
const chance = require("chance")();

const preBattleSetup = function (avatar, foe) {
  let a = Object.assign({}, avatar);
  let f = Object.assign({}, foe);
  let beginnersLuck;
  let scenario;
  let goesFirst;
  let effectProcs = [];

  return {
    determineBeginnersLuck: () => {
      const tXP = a.activityXP + a.battleXP;
      if (tXP < BEGINNERS_LUCK_MAX_XP) {
        beginnersLuck = chance.bool({ likelihood: BEGINNERS_LUCK_LIKELIHOOD });
      }
      beginnersLuck = false;
    },
    // Choose scenario then apply bonuses to Avatar & Foe. Return Avatar, Foe, and Scenario
    doScenarioAndBonus: () => {
      scenario = determineScenario(beginnersLuck);
      // assign 'a' variable above the value of sAvatar, same with 'f'
      ({ sAvatar: a, sFoe: f } = calcScenarioBonuses(a, f, scenario));
    },
    doPreBattleEffects: effects => {
      // If there are any effects, find 'prebattle' effects and adjust avatar accordingly
      if (effects && effects.length) {
        let procs = [];
        // Buff or debuff hero and foe based on item effects
        // If new item effects are added, they need to be added in this function:
        ({ avatar: a, foe: f, procs } = doAvatarBattlePrep(a, f, effects, scenario.id));
        effectProcs = [...effectProcs, ...procs];
      }
    },
    prepareFoe: () => {
      let procs = [];
      ({ avatar: a, foe: f, procs } = doFoeBattlePrep(a, f));

      effectProcs = [...effectProcs, ...procs];
    },
    applyElementalBonus: () => {
      // Figure out which season it is, so a 25% bonus can be given to a & f
      const { determineAstrologySeason } = avCalc();
      const seasonalBonusElement = determineAstrologySeason(Date.now()).element.toLowerCase();

      a[seasonalBonusElement] *= 1.25;
      f[seasonalBonusElement] *= 1.25;
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
      BRA: a,
      BRF: f,
      goesFirst,
      scenario,
      effectProcs,
    }),
  };
};

module.exports = preBattleSetup;
