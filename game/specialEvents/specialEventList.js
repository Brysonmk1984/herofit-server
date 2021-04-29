const testSpecificFoe = {
  eventName : "Test Specific Foe",
  description : "Used for selecting a specific foe",
  actionTypes : [{
    type : 'foeLikelihood',
    action : "Increased Likelyhood Foe",
    odds : 40,
    foe : 'Shadow-Self',
    foeClass : 'Spirits'
  },
  {
    type : 'foeLikelihood',
    action : "Increased Likelyhood Foe",
    odds : 80,
    foe : 'Plaguebringer',
    foeClass : 'Titans'
  }],
}

const attackOfTheElements = {
  eventName : "Attack of the Elements",
  description : "For twelve weeks, a new Elemental foe will be released in the game! During this time, there will be an increased chance to battle the new foe, as well as bonus Photon Tokens and XP for winning!",
  actionTypes : [{
    type : 'foeLikelihood',
    action : "Increased Likelyhood Foe",
    odds : 33,
    foe : 'Gusty Rascal',
    foeClass : 'Elementals'
  }],
}

module.exports = { testSpecificFoe, attackOfTheElements };


