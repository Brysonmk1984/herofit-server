import { arrayGroupBy, pickRandomArrayItem } from "../../lib/helperFunctions";
import { FoeTemplate, SpecialEvent, VillainJsonStructure } from "../../types/BackendOnlyTypes";
import HF from "../../types/herofit";
import { BEGINNERS_LUCK_LIKELIHOOD } from "../CONSTANTS";

const xpCalc = require("../upgrades/xpCalc");
const { determineXpBounty, determinePtBounty } = require("../battle/determineBounties");
const { OUTCOME_XP } = require("../CONSTANTS");
const chance = require("chance")();
const { FOE_MOD, LEVEL_DIFFICULTY_MOD, LOW_LEVEL, HIGH_LEVEL, HIGH_LEVEL_DIFFICULTY_MOD, BEGINNERS_LUCK_MAX_LEVEL } = require("../CONSTANTS");
const villains: VillainJsonStructure = require("../villains.json");
const { config } = require("../../appConfig");
const { handleFoeLikelihood, handleFoeBonusToStats } = require("../specialEvents/foeActionHandlers");

const { currentLevelByInput } = xpCalc();

// Separate all the foes from the json file into 3 difficulty categories
function _divideAvailableFoesByDifficulty(foes: FoeTemplate[], level: number) {
  const availableFoes = foes.filter(foe => !foe.itemSummonOnly && foe.levelRequirement <= level);

  return arrayGroupBy(availableFoes, "difficultyLevel");
}

function _specialEventFoeChance(level: number, event?: SpecialEvent) {
  // If Special Event is live, run code to attempt any special foe events
  if (event) {
    const foeLikelihoodAts = event.actionTypes.filter(at => at.type === "foeLikelihood" && (at.levelRequirement ? level >= at.levelRequirement : true));
    // If the event contains foeLikelihood actions
    if (foeLikelihoodAts.length) {
      // Result of handleChanceForFoe function could be a foe object, or null
      const foe = handleFoeLikelihood(foeLikelihoodAts);
      // If foe object, return it instead of randomly selecting below
      if (foe) {
        return foe;
      }
    }
  }
}

function _determineBeginnersLuck(level: number) {
  if (level < BEGINNERS_LUCK_MAX_LEVEL) {
    return chance.bool({ likelihood: BEGINNERS_LUCK_LIKELIHOOD });
  }
}

// Select possible return a non-itemSummonOnly, high level foe to be faced, otherwise undefined
function _randomBossEncounterChance(bossArray: FoeTemplate[]) {
  const bossFightHappening = chance.bool({ likelihood: 5.5 });

  // If by chance a boss fight is happening, select a random one from the passed in high level foes
  if (bossFightHappening) {
    return pickRandomArrayItem(bossArray);
  }
}

// Decides which foe template will be chosen for battle before stats are added
function selectFoeTemplate(level: number) {
  // Special Event Foe check
  const possibleSpecialEventFoe = _specialEventFoeChance(level, config.specialEvent);
  if (possibleSpecialEventFoe) {
    return possibleSpecialEventFoe;
  }

  // Combine all Villain templates into one array and groupBy difficulty
  const mergedVillains = Object.values(villains).flat();
  const { low, medium, high } = _divideAvailableFoesByDifficulty(mergedVillains, level);

  // Boss fight check
  const possibleBossFoe = _randomBossEncounterChance(high);
  if (possibleBossFoe) {
    return possibleBossFoe;
  }

  // Give Low level players a higher chance for an easier foe
  const beginnersLuckHappened = _determineBeginnersLuck(level);
  const finalFoeArray = beginnersLuckHappened ? low : [...low, ...medium];

  // Randomly select from final list of foes and return one
  return pickRandomArrayItem(finalFoeArray);
}

function generateFoeStats(avatar, foe) {
  const { total: totalLevel } = currentLevelByInput(avatar.activityXP + avatar.battleXP);

  // Random modifier within -15% of base stat
  function randomizer(stat, modifierInteger = -15) {
    let randomModifierDecimal = Math.floor(Math.random() * modifierInteger) * 0.01;
    const modifiedStat = stat + randomModifierDecimal * stat;
    return { stat: Math.floor(modifiedStat), modifier: randomModifierDecimal };
  }

  const isHighLevel = totalLevel >= HIGH_LEVEL ? true : false;
  const isMidLevel = LOW_LEVEL < totalLevel && totalLevel < HIGH_LEVEL ? true : false;

  let baseQP = Math.floor(totalLevel * 5 - 5);
  let baseFoeHealth = Math.floor((totalLevel * 5 + 100) * FOE_MOD.HEALTH);
  let baseFoePower = Math.floor((totalLevel * 5 + 100) * FOE_MOD.POWER);

  if (isMidLevel || isHighLevel) {
    baseQP = Math.floor(baseQP * LEVEL_DIFFICULTY_MOD);
    baseFoeHealth = Math.floor(baseFoeHealth * LEVEL_DIFFICULTY_MOD);
    baseFoePower = Math.floor(baseFoePower * LEVEL_DIFFICULTY_MOD);
    if (isHighLevel) {
      baseQP = Math.floor(baseQP * HIGH_LEVEL_DIFFICULTY_MOD);
      baseFoeHealth = Math.floor(baseFoeHealth * HIGH_LEVEL_DIFFICULTY_MOD);
      baseFoePower = Math.floor(baseFoePower * HIGH_LEVEL_DIFFICULTY_MOD);
    }
  }

  //console.log('HEALTH-', baseFoeHealth,'POWER', baseFoePower );

  // Different foes adjust QP differently on their stats
  // determined below in switch statement
  let qpAdjustedStats = [];

  // Foe with stats
  let fws = {
    health: 0,
    power: 0,
    armor: 0,
    fire: 0,
    earth: 0,
    water: 0,
    air: 0,
    difficulty: 0,
  };
  let randomizedHealth, randomizedPower, randomizedQP;

  switch (foe.class) {
    case "Spirits":
      // If it's the shadow boss, just return a mirror image of the avatar
      if (foe.type === "Shadow-Self") {
        return {
          health: avatar.health,
          power: avatar.power,
          armor: avatar.armor,
          fire: avatar.fire,
          earth: avatar.earth,
          water: avatar.water,
          air: avatar.air,
        };
      } else {
        randomizedHealth = randomizer(baseFoeHealth);
        randomizedPower = randomizer(baseFoePower);
        randomizedQP = randomizer(Math.floor(baseQP * FOE_MOD.QP));

        //console.log('BASE QP - ',baseQP, Math.floor(baseQP * FOE_MOD.QP),randomizedQP.stat );

        fws.health = Math.floor(randomizedHealth.stat);
        fws.power = Math.floor(randomizedPower.stat);

        if (foe.type === "Phantasm") {
          qpAdjustedStats = ["health", "health", "armor"];
        } else {
          qpAdjustedStats = ["health", "power", "armor"];
        }
        break;
      }
    case "Elementals":
      let elementalQp = FOE_MOD.QP;
      let baseHealth = baseFoeHealth;
      let basePower = baseFoePower;
      const bosses = ["Storming Oni", "Hulking Aggro Crag", "Scorching Archfiend", "High Priestess of the Tides"];
      const adepts = ["Wheezing Jinn", "Granite Golem", "Burning Jinn", "Cyclonic Siren"];
      if (bosses.includes(foe.type)) {
        elementalQp *= 1.2;
        baseHealth *= 1.1;
        basePower *= 1.0;
      } else if (adepts.includes(foe.type)) {
        elementalQp *= 1.2;
        baseHealth *= 1.1;
      } else {
        elementalQp *= 1.3;
      }

      randomizedHealth = randomizer(baseHealth);
      randomizedPower = randomizer(basePower);
      randomizedQP = randomizer(Math.floor(baseQP * elementalQp));

      fws.health = Math.floor(randomizedHealth.stat);
      fws.power = Math.floor(randomizedPower.stat);

      //Need to check for for types here for different elements
      switch (foe.type) {
        case "Gusty Rascal":
          fws.air = 50;
          qpAdjustedStats = ["air", "armor", "power", "health"];
          break;
        case "Rock Skipper":
          fws.earth = 50;
          qpAdjustedStats = ["earth", "armor", "power", "health"];
          break;
        case "Flame Fiend":
          fws.fire = 50;
          qpAdjustedStats = ["fire", "armor", "power", "health"];
          break;
        case "Splash Artist":
          fws.water = 50;
          qpAdjustedStats = ["water", "armor", "power", "health"];
          break;
        case "Wheezing Jinn":
          fws.air = 100 + totalLevel + Math.floor(totalLevel * 0.75);
          qpAdjustedStats = ["air", "armor", "power", "health"];
          break;
        case "Granite Golem":
          fws.earth = 100 + totalLevel + Math.floor(totalLevel * 0.75);
          qpAdjustedStats = ["earth", "armor", "power", "health"];
          break;
        case "Burning Jinn":
          fws.fire = 175 + totalLevel + Math.floor(totalLevel * 0.75);
          qpAdjustedStats = ["fire", "armor", "power", "health"];
          break;
        case "Cyclonic Siren":
          fws.water = 175 + totalLevel + Math.floor(totalLevel * 0.75);
          qpAdjustedStats = ["water", "armor", "power", "health"];
          break;
        case "Storming Oni":
          // Storming Oni Still needs more difficulty;
          randomizedQP = randomizer(Math.floor(baseQP * FOE_MOD.QP * 1.2));

          fws.air = 125 + 4 * totalLevel;
          qpAdjustedStats = ["air", "armor", "power", "health"];
          break;
        case "Hulking Aggro Crag":
          fws.earth = 125 + 4 * totalLevel;
          qpAdjustedStats = ["earth", "armor", "power", "health"];
          break;
        case "Scorching Archfiend":
          // Scorching Archfiend Still needs more difficulty;
          randomizedQP = randomizer(Math.floor(baseQP * FOE_MOD.QP * 1.5));

          fws.fire = 200 + 4.3 * totalLevel;
          qpAdjustedStats = ["fire", "armor", "power", "health"];

          break;
        case "High Priestess of the Tides":
          fws.water = 200 + 4.3 * totalLevel;
          qpAdjustedStats = ["water", "armor", "power", "health"];
          break;
        default:
          qpAdjustedStats = ["health", "power", "armor", "fire", "earth", "water", "air"];
          break;
      }
      break;
    case "Titans":
      randomizedHealth = randomizer(baseFoeHealth + 1.5 * totalLevel);
      randomizedPower = randomizer(baseFoePower);
      randomizedQP = randomizer(Math.floor(baseQP * FOE_MOD.QP));

      if (foe.type === "Plaguebringer") {
        fws.health = randomizedHealth < 300 ? 300 : Math.floor(randomizedHealth.stat);
        fws.power = Math.floor(randomizedPower.stat);
        fws.earth = 50 + 2.15 * totalLevel;
        fws.water = 50 + 2.15 * totalLevel;

        qpAdjustedStats = ["health", "power", "armor", "earth", "water"];
      } else if ("Guardian of the Depths") {
        const baseHealth = randomizedHealth < 400 ? 400 : Math.floor(randomizedHealth.stat);
        fws.health = baseHealth * 1.1;
        fws.power = Math.floor(randomizedPower.stat);
        fws.earth = 50 + 2.3 * totalLevel;
        fws.fire = 50 + 2.3 * totalLevel;

        qpAdjustedStats = ["health", "power", "armor", "earth", "fire"];
      }

      break;

    default:
    // Shouldn't happen
  }
  // ON ALL FOES EXCEPT SHADOW-SELF:

  // Calculates the overall difficulty modification after randomization. Used for pt and xp after battles
  fws.difficulty = -((randomizedHealth.modifier + randomizedPower.modifier + randomizedQP.modifier) / 3).toFixed(3);

  // Randomize the stat distribution for foes
  const baseFoeQp = randomizedQP.stat;
  for (let points = baseFoeQp; points > 0; points--) {
    const attr = qpAdjustedStats[Math.floor(Math.random() * qpAdjustedStats.length)];
    fws[attr] += 1;
  }

  // Apply any special event actionTypes of type 'foeBonusToStats'
  const event = config.specialEvent;
  // If Special Event is live, run code to attempt any special foe events
  if (event) {
    const foeBonusToStatsAts = event.actionTypes.filter(at => at.type === "foeBonusToStats");
    // If the event contains foeLikelihood actions
    if (foeBonusToStatsAts.length) {
      // Result of handleChanceForFoe function could be a foe object, or null
      fws = handleFoeBonusToStats(foeBonusToStatsAts, fws);
    }
  }

  // Return foe with stats to be saved for upcoming battle!
  return fws;
}

// Foe param is usually null, unless an item created the battle
function determineFoeWithStats(avatar, foeTemplate = null) {
  const { level, albedo } = currentLevelByInput(avatar.activityXP + avatar.battleXP);
  //console.log('FT', foeTemplate);
  // Use passed in foe template, otherwise randomly pick one
  foeTemplate = foeTemplate ? foeTemplate : selectFoeTemplate(level);

  let foeName;

  if (foeTemplate.type === "Shadow-Self") {
    foeName = `Shadow ${avatar.name}`;
  } else {
    // specific foe for testing purposes
    //foeName = foeTemplate.foe[1];

    foeName = foeTemplate.foe[Math.floor(Math.random() * foeTemplate.foe.length)];
  }

  const foe = {
    id: foeTemplate.id,
    type: foeTemplate.type,
    difficultyLevel: foeTemplate.difficultyLevel,
    name: foeName,
    ability: foeTemplate.ability,
    class: foeTemplate.class,
  };
  const foeWithStats = Object.assign({}, foe, generateFoeStats(avatar, foe));

  foeWithStats.xpBounty = determineXpBounty(OUTCOME_XP.base, foeWithStats.difficulty, level, foeTemplate.bonusXpBase, foeWithStats.type);
  foeWithStats.ptBounty = determinePtBounty(level, foeTemplate.bonusPtBase, foeWithStats.type);

  return foeWithStats;
}

function findFoeTemplateByType(foeType) {
  const allFoes = [];
  for (let foeClass in villains) {
    allFoes.push(...villains[foeClass]);
  }

  return allFoes.find(foe => foe.type === foeType);
}

module.exports = {
  generateFoeStats,
  selectFoeTemplate,
  determineFoeWithStats,
  findFoeTemplateByType,
  unitTestExporter,
};

function unitTestExporter() {
  return {
    _divideAvailableFoesByDifficulty,
    selectFoeTemplate,
  };
}
