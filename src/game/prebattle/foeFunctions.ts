import { arrayGroupBy, parseStats, pickRandomArrayItem } from "../../lib/helperFunctions";
import { FoeStats, FoeTemplate, SpecialEvent, VillainJsonStructure } from "../../types/BackendOnlyTypes";
import { determineXpBounty, determinePtBounty } from "../battle/determineBounties";
import HF from "../../types/herofit";
import { BEGINNERS_LUCK_LIKELIHOOD, OUTCOME_XP, BEGINNERS_LUCK_MAX_LEVEL } from "../CONSTANTS";
import { handleFoeLikelihood } from "../specialEvents/foeActionHandlers";
import villainsJson from "../villains.json";
import chanceInit from "chance";
import { config } from "../../appConfig";
const { generateFoeStats } = require("./generateFoeStats");
const villains = villainsJson as VillainJsonStructure;
const chance = chanceInit();

// Separate all the foes from the json file into 3 difficulty categories
function _divideAvailableFoesByDifficulty(foes: FoeTemplate[], level: number) {
  const availableFoes = foes.filter(foe => !foe.itemSummonOnly && foe.levelRequirement <= level);

  return arrayGroupBy(availableFoes, "difficultyLevel");
}

// Special Event Foe Chance
function _specialEventFoeChance(level: number, event?: SpecialEvent) {
  // If Special Event is live, run code to attempt any special foe events
  if (event) {
    // Filter down to just foeLikelihood ATs
    const foeLikelihoodAts = event.actionTypes.filter(at => at.type === "foeLikelihood");

    // If the event contains foeLikelihood actions
    if (foeLikelihoodAts.length) {
      // Result of handleChanceForFoe function could be a foe object, or null
      return handleFoeLikelihood(foeLikelihoodAts, level);
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

// Decides which foe template will be chosen for battle before stats are added
function selectFoeTemplate(level: number) {
  // Special Event Foe check
  const possibleSpecialEventFoe = <FoeTemplate>_specialEventFoeChance(level, config.specialEvent);
  if (possibleSpecialEventFoe) {
    return possibleSpecialEventFoe;
  }

  // Combine all Villain templates into one array and groupBy difficulty
  const mergedVillains = Object.values(villains).flat();
  const { low, medium, high = [] } = _divideAvailableFoesByDifficulty(mergedVillains, level);

  // Boss fight check, must at least have one possible boss to fight (level 10)
  if (high.length) {
    const possibleBossFoe = _randomBossEncounterChance(high);
    if (possibleBossFoe) {
      return possibleBossFoe;
    }
  }

  // Give Low level players a higher chance for an easier foe
  const beginnersLuckHappened = _determineBeginnersLuck(level);
  const finalFoeArray = beginnersLuckHappened ? low : [...low, ...medium];

  // Randomly select from final list of foes and return one
  return pickRandomArrayItem<FoeTemplate>(finalFoeArray);
}

// Select foeTemplate by passed in foeType
function findFoeTemplateByType(foeType: HF.FoeType) {
  return Object.values(villains)
    .flat()
    .find(foe => foe.type === foeType);
}

// Foe param is usually null, unless an item created the battle
function determineFoeWithStats(avatar: HF.Hero, foeTemplate: FoeTemplate, totalLevel: number): HF.Foe {
  // GenerateFoeStatsBased on template, or for shadow self, copy of hero will stats will be returned
  const foeStats = parseStats(generateFoeStats(avatar, foeTemplate), true) as FoeStats;

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

module.exports = {
  selectFoeTemplate,
  findFoeTemplateByType,
  determineFoeWithStats,
  unitTestExporter,
};

// For testing local functions
function unitTestExporter() {
  return {
    _generateFoeName,
    _randomBossEncounterChance,
    _determineBeginnersLuck,
    _specialEventFoeChance,
    _divideAvailableFoesByDifficulty,
  };
}
