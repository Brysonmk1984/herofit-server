const chance = require('chance')();
const villains = require('../villains.json');

// Used to boost a foe's chance of getting selected for battle
const handleFoeLikelihood = function(foeLikelihoodAts){
  // For each action type that increases foe likelihood
  // Loop through and test with actionOdds likelihood whether or not hero will go to battle with that particular foe
  // If one foe does match up, then exit function with foe, otherwise, test the next actionType / foe
  for(let i=0; i < foeLikelihoodAts.length; i++){
    const at = foeLikelihoodAts[i];
    // 33% Chance to get Elemental.
    const battleSpecialEventFoe = chance.bool({ likelihood: at.odds });
    if(battleSpecialEventFoe){
      return villains[at.foeClass].find(foe => foe.type === at.foe);
    }
  }

  return null;
}

const handleFoeBonusToStats = function(foeBonusToStatsAts, fws){
  const boostedFoe = Object.assign({}, fws);

  // For each 'foeBonusToStatsAts' action type
  for(let i=0; i < foeBonusToStatsAts.length; i++){
    const at = foeBonusToStatsAts[i];
    // For each statwithin the at.stats array, give a boost
    at.stats.forEach((stat) =>{
      boostedFoe[stat] = (boostedFoe[stat] * at.bonusPercent) + boostedFoe[stat];
    });
  };
  return boostedFoe;
}

module.exports =  { handleFoeLikelihood, handleFoeBonusToStats };