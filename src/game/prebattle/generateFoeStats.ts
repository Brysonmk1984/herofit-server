import HF from "../../types/herofit";
import { FoeStats, FoeTemplate, PossibleFoeStat, SpecialEvent, SpecialEventActionType } from "../../types/BackendOnlyTypes";
import { FOE_MOD, LEVEL_DIFFICULTY_MOD, LOW_LEVEL, HIGH_LEVEL, HIGH_LEVEL_DIFFICULTY_MOD } from "../CONSTANTS";
import { handleFoeBonusToStats } from "../specialEvents/foeActionHandlers";
import xpCalc from "../upgrades/xpCalc";
import { config } from "../../appConfig";
const { currentLevelByInput } = xpCalc();

// Chance for boosting foes stats based on special event
function _determineBonusToStatsSpecialEvent(event: SpecialEvent, foeStats: FoeStats) {
  // If Special Event is live, run code to attempt any special foe events
  if (event) {
    const foeBonusToStatsAts = event.actionTypes.filter((at: SpecialEventActionType) => at.type === "foeBonusToStats");
    // If the event contains foeLikelihood actions
    if (foeBonusToStatsAts.length) {
      // Result of handleChanceForFoe function could be a foe object, or null
      return handleFoeBonusToStats(foeBonusToStatsAts, foeStats);
    }
  }
  return foeStats;
}

// Random modifier within -15% of base stat
function _randomizer(statVal: number, modifierInteger = -15) {
  let randomModifierDecimal = Math.floor(Math.random() * modifierInteger) * 0.01;
  const modifiedStat = Math.floor(statVal + randomModifierDecimal * statVal);
  return { stat: modifiedStat, modifier: randomModifierDecimal };
}

// Determine Foe's Base power, health and qp based on hero level
function _determineBasePrimaryFoeStats(totalLevel: number) {
  let baseQP = totalLevel * 5 - 5;
  let baseFoePower = (totalLevel * 5 + 100) * FOE_MOD.POWER;
  let baseFoeHealth = (totalLevel * 5 + 100) * FOE_MOD.HEALTH;
  const isHighLevel = totalLevel >= HIGH_LEVEL ? true : false;
  const isMidLevel = LOW_LEVEL < totalLevel && totalLevel < HIGH_LEVEL ? true : false;

  if (isMidLevel || isHighLevel) {
    baseQP = baseQP * LEVEL_DIFFICULTY_MOD;
    baseFoeHealth = baseFoeHealth * LEVEL_DIFFICULTY_MOD;
    baseFoePower = baseFoePower * LEVEL_DIFFICULTY_MOD;
    if (isHighLevel) {
      baseQP = baseQP * HIGH_LEVEL_DIFFICULTY_MOD;
      baseFoeHealth = baseFoeHealth * HIGH_LEVEL_DIFFICULTY_MOD;
      baseFoePower = baseFoePower * HIGH_LEVEL_DIFFICULTY_MOD;
    }
  }
  return {
    baseQP,
    baseFoeHealth,
    baseFoePower,
  };
}

// Randomize the stat distribution for foes
function _randomlySpendQpOnStats(baseFoeQp: number, initialFoeStats: FoeStats, qpAdjustedStats: PossibleFoeStat[]): FoeStats {
  const foeStats = { ...initialFoeStats };
  for (let points = baseFoeQp; points > 0; points--) {
    const attr = qpAdjustedStats[Math.floor(Math.random() * qpAdjustedStats.length)];
    foeStats[attr] += 1;
  }
  return foeStats;
}

interface FoeTemplateWithUnassignedStats extends FoeTemplate {
  health: number;
  power: number;
  armor: number;
  fire: number;
  earth: number;
  water: number;
  air: number;
  difficulty: number;
}

function _determineSpiritStats(baseQP: number, baseFoeHealth: number, baseFoePower: number, foe: FoeTemplateWithUnassignedStats) {
  const randomizedHealth = _randomizer(baseFoeHealth);
  const randomizedPower = _randomizer(baseFoePower);
  const randomizedQP = _randomizer(Math.floor(baseQP * FOE_MOD.QP));

  return {
    foeStats: {
      ...foe,
      health: randomizedHealth.stat,
      power: randomizedPower.stat,
      qp: randomizedQP.stat,
      // Calculates the overall difficulty modification after randomization. Used for pt and xp after battles
      difficulty: -((randomizedHealth.modifier + randomizedPower.modifier + randomizedQP.modifier) / 3).toFixed(3),
    },
    qpAdjustedStats: foe.type === "Phantasm" ? (["health", "health", "armor", "power"] as PossibleFoeStat[]) : (["health", "power", "armor"] as PossibleFoeStat[]),
  };
}

function _determineElementalStats(baseQP: number, baseFoeHealth: number, baseFoePower: number, foe: FoeTemplateWithUnassignedStats, totalLevel: number) {
  // Adjust stats based on Elemental Foe category (minion, adept, boss)
  if (foe.difficultyLevel === "high") {
    baseQP *= 1.3;
    baseFoeHealth *= 1.1;
  } else if (foe.difficultyLevel === "medium") {
    baseQP *= 1.2;
    baseFoeHealth *= 1.1;
  } else {
    baseQP *= 1.3;
  }

  const randomizedHealth = _randomizer(baseFoeHealth);
  const randomizedPower = _randomizer(baseFoePower);
  let randomizedQP = _randomizer(Math.floor(baseQP * FOE_MOD.QP));
  let qpAdjustedStats: PossibleFoeStat[] = [];
  //console.log('RANDOM ELM',randomizedHealth,randomizedPower,randomizedQP );
  //Need to check for for types here for different elements
  switch (foe.type) {
    case "Gusty Rascal":
      foe.air = 50;
      qpAdjustedStats = ["air", "armor", "power", "health"];
      break;
    case "Rock Skipper":
      foe.earth = 50;
      qpAdjustedStats = ["earth", "armor", "power", "health"];
      break;
    case "Flame Fiend":
      foe.fire = 50;
      qpAdjustedStats = ["fire", "armor", "power", "health"];
      break;
    case "Splash Artist":
      foe.water = 50;
      qpAdjustedStats = ["water", "armor", "power", "health"];
      break;
    case "Wheezing Jinn":
      foe.air = 100 + totalLevel + totalLevel * 0.75;
      qpAdjustedStats = ["air", "armor", "power", "health"];
      break;
    case "Granite Golem":
      foe.earth = 100 + totalLevel + totalLevel * 0.75;
      qpAdjustedStats = ["earth", "armor", "power", "health"];
      break;
    case "Burning Jinn":
      foe.fire = 175 + totalLevel + totalLevel * 0.75;
      qpAdjustedStats = ["fire", "armor", "power", "health"];
      break;
    case "Cyclonic Siren":
      foe.water = 175 + totalLevel + totalLevel * 0.75;
      qpAdjustedStats = ["water", "armor", "power", "health"];
      break;
    case "Storming Oni":
      // Storming Oni Still needs more difficulty;
      randomizedQP = _randomizer(Math.floor(baseQP * FOE_MOD.QP * 1.2));

      foe.air = 125 + 4 * totalLevel;
      qpAdjustedStats = ["air", "armor", "power", "health"];
      break;
    case "Hulking Aggro Crag":
      foe.earth = 125 + 4 * totalLevel;
      qpAdjustedStats = ["earth", "armor", "power", "health"];
      break;
    case "Scorching Archfiend":
      // Scorching Archfiend Still needs more difficulty;
      randomizedQP = _randomizer(Math.floor(baseQP * FOE_MOD.QP * 1.5));

      foe.fire = 200 + 4.3 * totalLevel;
      qpAdjustedStats = ["fire", "armor", "power", "health"];

      break;
    case "High Priestess of the Tides":
      foe.water = 200 + 4.3 * totalLevel;
      qpAdjustedStats = ["water", "armor", "power", "health"];
      break;
    default:
      qpAdjustedStats = ["health", "power", "armor", "fire", "earth", "water", "air"];
      break;
  }

  return {
    foeStats: {
      ...foe,
      health: randomizedHealth.stat,
      power: randomizedPower.stat,
      qp: randomizedQP.stat,
      // Calculates the overall difficulty modification after randomization. Used for pt and xp after battles
      difficulty: -((randomizedHealth.modifier + randomizedPower.modifier + randomizedQP.modifier) / 3).toFixed(3),
    },
    qpAdjustedStats,
  };
}

function _determineTitanStats(baseQP: number, baseFoeHealth: number, baseFoePower: number, foe: FoeTemplateWithUnassignedStats, totalLevel: number) {
  const randomizedHealth = _randomizer(baseFoeHealth + 1.5 * totalLevel);
  const randomizedPower = _randomizer(baseFoePower);
  const randomizedQP = _randomizer(Math.floor(baseQP * FOE_MOD.QP));
  //console.log('RANDOM TITAN',randomizedHealth,randomizedPower,randomizedQP );
  let qpAdjustedStats: PossibleFoeStat[] = [];

  if (foe.type === "Plaguebringer") {
    foe.health = randomizedHealth.stat < 300 ? 300 : randomizedHealth.stat;
    foe.power = randomizedPower.stat;
    foe.earth = 50 + 2.15 * totalLevel;
    foe.water = 50 + 2.15 * totalLevel;
    qpAdjustedStats = ["health", "power", "armor", "earth", "water"];
  } else if ("Guardian of the Depths") {
    const baseHealth = randomizedHealth.stat < 400 ? 400 : randomizedHealth.stat;
    foe.health = baseHealth * 1.1;
    foe.power = randomizedPower.stat;
    foe.earth = 50 + 2.3 * totalLevel;
    foe.fire = 50 + 2.3 * totalLevel;
    qpAdjustedStats = ["health", "power", "armor", "earth", "fire"];
  }

  return {
    foeStats: {
      ...foe,
      health: randomizedHealth.stat,
      power: randomizedPower.stat,
      qp: randomizedQP.stat,
      // Calculates the overall difficulty modification after randomization. Used for pt and xp after battles
      difficulty: -((randomizedHealth.modifier + randomizedPower.modifier + randomizedQP.modifier) / 3).toFixed(3),
    },
    qpAdjustedStats,
  };
}

function _generateShadowSelf(hero: HF.Hero) {
  return {
    health: hero.health,
    power: hero.power,
    armor: hero.armor,
    fire: hero.fire,
    earth: hero.earth,
    water: hero.water,
    air: hero.air,
    qp: 0,
    difficulty: 0.1,
  };
}

interface StatsByFoeClass {
  foeStats: FoeStats;
  qpAdjustedStats: PossibleFoeStat[];
}

function _determineStatsByFoeClass(foe: FoeTemplateWithUnassignedStats, totalLevel: number): StatsByFoeClass {
  const { baseQP, baseFoeHealth, baseFoePower } = _determineBasePrimaryFoeStats(totalLevel);

  switch (foe.class) {
    case "Spirits":
      return _determineSpiritStats(baseQP, baseFoeHealth, baseFoePower, foe);
    case "Elementals":
      return _determineElementalStats(baseQP, baseFoeHealth, baseFoePower, foe, totalLevel);
    case "Titans":
      return _determineTitanStats(baseQP, baseFoeHealth, baseFoePower, foe, totalLevel);
    default:
      // Shouldn't happen
      throw new Error("No Matching Foe Class");
  }
}

// Generate FoeStats based on foeTemplate and Hero
function generateFoeStats(hero: HF.Hero, foe: FoeTemplate): FoeStats {
  const { total: totalLevel } = currentLevelByInput(hero.activityXP + hero.battleXP);
  const foeWithBaseStatTemplate: FoeTemplateWithUnassignedStats = Object.assign({}, { health: 0, power: 0, armor: 0, fire: 0, earth: 0, water: 0, air: 0, difficulty: 0 }, foe);

  // Early return for Shadow-Self boss
  if (foe.type === "Shadow-Self") {
    return _generateShadowSelf(hero);
  }

  // Assign class-specific stats
  const { foeStats, qpAdjustedStats } = _determineStatsByFoeClass(foeWithBaseStatTemplate, totalLevel);

  // Randomly Spend QP on stats
  const foeStatsWithSpentQp = _randomlySpendQpOnStats(foeStats.qp, foeStats, qpAdjustedStats);

  // Apply any special event actionTypes of type 'foeBonusToStats'
  const foeStatsWithSpecialEventBonus = _determineBonusToStatsSpecialEvent(config.specialEvent, foeStatsWithSpentQp);

  // Return foe with stats to be saved for upcoming battle!
  return foeStatsWithSpecialEventBonus;
}

export { generateFoeStats, unitTestExporter };

function unitTestExporter() {
  return {
    _determineBonusToStatsSpecialEvent,
  };
}
