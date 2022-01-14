import { arrayGroupBy, pickRandomArrayItem } from "../../lib/helperFunctions";
import { FoeStats, FoeTemplate, SpecialEvent, SpecialEventActionType, VillainJsonStructure } from "../../types/BackendOnlyTypes";
import { determineXpBounty, determinePtBounty } from "../battle/determineBounties";
import HF from "../../types/herofit";
import { BEGINNERS_LUCK_LIKELIHOOD, OUTCOME_XP, FOE_MOD, LEVEL_DIFFICULTY_MOD, LOW_LEVEL, HIGH_LEVEL, HIGH_LEVEL_DIFFICULTY_MOD, BEGINNERS_LUCK_MAX_LEVEL } from "../CONSTANTS";
import { handleFoeLikelihood, handleFoeBonusToStats } from "../specialEvents/foeActionHandlers";
import villainsJson from "../villains.json";
import xpCalc from "../upgrades/xpCalc";
import chanceInit from "chance";
import { config } from "../../appConfig";

const villains = villainsJson as VillainJsonStructure;
const chance = chanceInit();
const { currentLevelByInput } = xpCalc();

// Separate all the foes from the json file into 3 difficulty categories
function _divideAvailableFoesByDifficulty(foes: FoeTemplate[], level: number) {
  const availableFoes = foes.filter(foe => !foe.itemSummonOnly && foe.levelRequirement <= level);

  return arrayGroupBy(availableFoes, "difficultyLevel");
}

// Special Event Foe Chance
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

// Determine if beginners luck happened - for foe selection only
function _determineBeginnersLuck(level: number) {
  if (level < BEGINNERS_LUCK_MAX_LEVEL) {
    return chance.bool({ likelihood: BEGINNERS_LUCK_LIKELIHOOD });
  }
  return false;
}

// Select possible return a non-itemSummonOnly, high level foe to be faced, otherwise undefined
function _randomBossEncounterChance(bossArray: FoeTemplate[]) {
  const bossFightHappening = chance.bool({ likelihood: 5.5 });

  // If by chance a boss fight is happening, select a random one from the passed in high level foes
  if (bossFightHappening) {
    return pickRandomArrayItem(bossArray);
  }
  return null;
}

// Selects a random for name from the list provided in the template, or if Shadow Boss, returns Shadow-${heroName}
function _generateFoeName(foeTemplate: FoeTemplate, avatarName: string) {
  return foeTemplate.type === "Shadow-Self" ? `Shadow ${avatarName}` : pickRandomArrayItem(foeTemplate.foe);
}

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

// Decides which foe template will be chosen for battle before stats are added
function selectFoeTemplate(level: number) {
  // Special Event Foe check
  const possibleSpecialEventFoe = <FoeTemplate>_specialEventFoeChance(level, config.specialEvent);
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
  return pickRandomArrayItem<FoeTemplate>(finalFoeArray);
}

// Generate FoeStats based on foeTemplate and Hero
function _generateFoeStats(avatar: HF.Hero, foe: FoeTemplate): FoeStats {
  const { total: totalLevel } = currentLevelByInput(avatar.activityXP + avatar.battleXP);

  // Random modifier within -15% of base stat
  function randomizer(statVal: number, modifierInteger = -15) {
    let randomModifierDecimal = Math.floor(Math.random() * modifierInteger) * 0.01;
    const modifiedStat = statVal + randomModifierDecimal * statVal;
    return { stat: Math.floor(modifiedStat), modifier: randomModifierDecimal };
  }

  // Base power, health and qp based on hero level
  function determineBasePrimaryFoeStats(totalLevel: number) {
    let baseQP = Math.floor(totalLevel * 5 - 5);
    let baseFoeHealth = Math.floor((totalLevel * 5 + 100) * FOE_MOD.HEALTH);
    let baseFoePower = Math.floor((totalLevel * 5 + 100) * FOE_MOD.POWER);

    const isHighLevel = totalLevel >= HIGH_LEVEL ? true : false;
    const isMidLevel = LOW_LEVEL < totalLevel && totalLevel < HIGH_LEVEL ? true : false;

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
    return {
      baseQP,
      baseFoeHealth,
      baseFoePower,
    };
  }

  // Different foes adjust QP differently on their stats
  // determined below in switch statement
  let qpAdjustedStats: Lowercase<Exclude<HF.Stat, "Recovery" | "Aether">>[] = [];

  // Foe with stats
  let foeStats = {
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
  const { baseQP, baseFoeHealth, baseFoePower } = determineBasePrimaryFoeStats(totalLevel);

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
          difficulty: 0,
        };
      } else {
        randomizedHealth = randomizer(baseFoeHealth);
        randomizedPower = randomizer(baseFoePower);
        randomizedQP = randomizer(Math.floor(baseQP * FOE_MOD.QP));

        //console.log('BASE QP - ',baseQP, Math.floor(baseQP * FOE_MOD.QP),randomizedQP.stat );

        foeStats.health = Math.floor(randomizedHealth.stat);
        foeStats.power = Math.floor(randomizedPower.stat);

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

      foeStats.health = Math.floor(randomizedHealth.stat);
      foeStats.power = Math.floor(randomizedPower.stat);

      //Need to check for for types here for different elements
      switch (foe.type) {
        case "Gusty Rascal":
          foeStats.air = 50;
          qpAdjustedStats = ["air", "armor", "power", "health"];
          break;
        case "Rock Skipper":
          foeStats.earth = 50;
          qpAdjustedStats = ["earth", "armor", "power", "health"];
          break;
        case "Flame Fiend":
          foeStats.fire = 50;
          qpAdjustedStats = ["fire", "armor", "power", "health"];
          break;
        case "Splash Artist":
          foeStats.water = 50;
          qpAdjustedStats = ["water", "armor", "power", "health"];
          break;
        case "Wheezing Jinn":
          foeStats.air = 100 + totalLevel + Math.floor(totalLevel * 0.75);
          qpAdjustedStats = ["air", "armor", "power", "health"];
          break;
        case "Granite Golem":
          foeStats.earth = 100 + totalLevel + Math.floor(totalLevel * 0.75);
          qpAdjustedStats = ["earth", "armor", "power", "health"];
          break;
        case "Burning Jinn":
          foeStats.fire = 175 + totalLevel + Math.floor(totalLevel * 0.75);
          qpAdjustedStats = ["fire", "armor", "power", "health"];
          break;
        case "Cyclonic Siren":
          foeStats.water = 175 + totalLevel + Math.floor(totalLevel * 0.75);
          qpAdjustedStats = ["water", "armor", "power", "health"];
          break;
        case "Storming Oni":
          // Storming Oni Still needs more difficulty;
          randomizedQP = randomizer(Math.floor(baseQP * FOE_MOD.QP * 1.2));

          foeStats.air = 125 + 4 * totalLevel;
          qpAdjustedStats = ["air", "armor", "power", "health"];
          break;
        case "Hulking Aggro Crag":
          foeStats.earth = 125 + 4 * totalLevel;
          qpAdjustedStats = ["earth", "armor", "power", "health"];
          break;
        case "Scorching Archfiend":
          // Scorching Archfiend Still needs more difficulty;
          randomizedQP = randomizer(Math.floor(baseQP * FOE_MOD.QP * 1.5));

          foeStats.fire = 200 + 4.3 * totalLevel;
          qpAdjustedStats = ["fire", "armor", "power", "health"];

          break;
        case "High Priestess of the Tides":
          foeStats.water = 200 + 4.3 * totalLevel;
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
        foeStats.health = randomizedHealth.stat < 300 ? 300 : Math.floor(randomizedHealth.stat);
        foeStats.power = Math.floor(randomizedPower.stat);
        foeStats.earth = 50 + 2.15 * totalLevel;
        foeStats.water = 50 + 2.15 * totalLevel;

        qpAdjustedStats = ["health", "power", "armor", "earth", "water"];
      } else if ("Guardian of the Depths") {
        const baseHealth = randomizedHealth.stat < 400 ? 400 : Math.floor(randomizedHealth.stat);
        foeStats.health = baseHealth * 1.1;
        foeStats.power = Math.floor(randomizedPower.stat);
        foeStats.earth = 50 + 2.3 * totalLevel;
        foeStats.fire = 50 + 2.3 * totalLevel;

        qpAdjustedStats = ["health", "power", "armor", "earth", "fire"];
      }

      break;

    default:
    // Shouldn't happen
  }
  // ON ALL FOES EXCEPT SHADOW-SELF:

  // Calculates the overall difficulty modification after randomization. Used for pt and xp after battles
  foeStats.difficulty = -((randomizedHealth.modifier + randomizedPower.modifier + randomizedQP.modifier) / 3).toFixed(3);

  // Randomize the stat distribution for foes
  const baseFoeQp = randomizedQP.stat;
  for (let points = baseFoeQp; points > 0; points--) {
    const attr = qpAdjustedStats[Math.floor(Math.random() * qpAdjustedStats.length)];
    foeStats[attr] += 1;
  }

  // Apply any special event actionTypes of type 'foeBonusToStats'
  foeStats = _determineBonusToStatsSpecialEvent(config.specialEvent, foeStats);

  // Return foe with stats to be saved for upcoming battle!
  return foeStats;
}

// Foe param is usually null, unless an item created the battle
function determineFoeWithStats(avatar: HF.Hero, foeTemplate: FoeTemplate, totalLevel: number): HF.Foe {
  const foeStats = _generateFoeStats(avatar, foeTemplate);

  return {
    type: foeTemplate.type,
    ability: foeTemplate.ability,
    class: foeTemplate.class,
    name: _generateFoeName(foeTemplate, avatar.name),
    xpBounty: determineXpBounty(OUTCOME_XP.base, foeStats.difficulty, totalLevel, foeTemplate.bonusXpBase, foeTemplate.type),
    ptBounty: determinePtBounty(totalLevel, foeTemplate.bonusPtBase, foeTemplate.type),
    ...foeStats,
  };
}

// Select foeTemplate by passed in foeType
function findFoeTemplateByType(foeType: HF.FoeType) {
  return Object.values(villains)
    .flat()
    .find(foe => foe.type === foeType);
}

module.exports = {
  selectFoeTemplate,
  determineFoeWithStats,
  findFoeTemplateByType,
  unitTestExporter,
};

// For testing local functions
function unitTestExporter() {
  return {
    _generateFoeStats,
    _determineBonusToStatsSpecialEvent,
    _generateFoeName,
    _randomBossEncounterChance,
    _determineBeginnersLuck,
    _specialEventFoeChance,
    _divideAvailableFoesByDifficulty,
  };
}
