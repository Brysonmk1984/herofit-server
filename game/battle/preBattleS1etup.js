const { BEGINNERS_LUCK_MAX_XP, BEGINNERS_LUCK_LIKELIHOOD } = require('../CONSTANTS'); 
const { determineScenario, calcScenarioBonuses } = require('./scenario');
const { doAvatarBattlePrep, doFoeBattlePrep } = require('./doBattlePrep');
const avCalc = require('../upgrades/avCalc');
const chance = require('chance')();


const preBattleSetup = function(avatar, foe){
  let a = Object.assign({}, avatar);
  let f = Object.assign({}, foe);
  let beginnersLuck;
  let scenario;
  let goesFirst;

  return {
    determineBeginnersLuck : () => {
      const tXP = a.activityXP + a.battleXP;
      if(tXP < BEGINNERS_LUCK_MAX_XP){
        beginnersLuck = chance.bool({ likelihood: BEGINNERS_LUCK_LIKELIHOOD});
      }
      beginnersLuck = false;
    },
    // Choose scenario then apply bonuses to Avatar & Foe. Return Avatar, Foe, and Scenario
    doScenarioAndBonus : () => {
      scenario = determineScenario(beginnersLuck);
      // assign 'a' variable above the value of sAvatar, same with 'f'
      ({ sAvatar : a, sFoe : f } = calcScenarioBonuses(a, f, scenario));
    },
    doPreBattleEffects : (effects) => {
      // If there are any effects, find 'prebattle' effects and adjust avatar accordingly
      if(effects && effects.length){
        const preBattleEffects = effects.filter(effect => effect.type === 'prebattle');
        // Buff or debuff hero and foe based on item effects
        // If new item effects are added, they need to be added in this function:
        ({ avatar : a, foe : f } = doAvatarBattlePrep(a, f, preBattleEffects, scenario.id));
      }
    },
    prepareFoe : () => {
      ({ avatar : a, foe : f } = doFoeBattlePrep(a, f));
    },
    applyElementalBonus : () => {
      // Figure out which season it is, so a 25% bonus can be given to a & f
      const { determineAstrologySeason } = avCalc();
      const seasonalBonusElement = determineAstrologySeason(Date.now()).element.toLowerCase();

      a[seasonalBonusElement] *= 1.25;
      f[seasonalBonusElement] *= 1.25;
    },
    determineAggressor : () => {

      if(scenario.id === 0){
        goesFirst = 'Avatar';
      }else if(scenario.id === 3){
        goesFirst = 'Foe';
      }else{
        // 66% Chance the Avatar will go first if below level 15
        if(beginnersLuck){
          goesFirst = 'Avatar';
        }else{
          // randomly decide
          const avIsFirst = chance.bool({ likelihood : 50 });
          goesFirst = avIsFirst ? 'Avatar' : 'Foe';
        }
      }
    },
    applyCheat : (powerBoost, healthReduction) =>{
      a.power = powerBoost;
      f.health = healthReduction;
    },
    getPreBattlePackage : () => ({ BRA : a, BRF : f, goesFirst, scenario })
  }
};

module.exports = preBattleSetup;