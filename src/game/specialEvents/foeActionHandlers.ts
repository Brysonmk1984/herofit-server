import { FoeStats, FoeTemplate, SpecialEventActionType, VillainJsonStructure } from "../../types/BackendOnlyTypes";
import villainsJson from "../villains.json";
import chanceInit from "chance";
const villains = villainsJson as VillainJsonStructure;
const chance = chanceInit();

// Used to boost a foe's chance of getting selected for battle
const handleFoeLikelihood = function (foeLikelihoodAts: SpecialEventActionType[]) {
  // For each action type that increases foe likelihood
  // Loop through and test with actionOdds likelihood whether or not hero will go to battle with that particular foe
  // If one foe does match up, then exit function with foe, otherwise, test the next actionType / foe
  for (let i = 0; i < foeLikelihoodAts.length; i++) {
    const at = foeLikelihoodAts[i];
    // 33% Chance to get Elemental.
    const battleSpecialEventFoe = chance.bool({ likelihood: at.odds });
    if (battleSpecialEventFoe) {
      return villains[at.foeClass].find((foe: FoeTemplate) => foe.type === at.foe);
    }
  }

  return null;
};

const handleFoeBonusToStats = function (foeBonusToStatsAts: SpecialEventActionType[], foeStats: FoeStats) {
  const boostedFoeStats = { ...foeStats };

  // For each 'foeBonusToStatsAts' action type
  for (let i = 0; i < foeBonusToStatsAts.length; i++) {
    const at = foeBonusToStatsAts[i];
    // For each stat within the at.stats array, give a boost
    at.stats.forEach(stat => {
      boostedFoeStats[stat] = boostedFoeStats[stat] * at.bonusPercent + boostedFoeStats[stat];
    });
  }
  return boostedFoeStats;
};

export { handleFoeLikelihood, handleFoeBonusToStats };
