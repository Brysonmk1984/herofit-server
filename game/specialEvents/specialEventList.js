const testSpecificFoe = {
  eventName : "Test Specific Foe",
  description : "Used for selecting a specific foe",
  actionTypes : [{
    type : 'foeLikelihood',
    action : "Increased Likelyhood Foe",
    odds : 0,
    foe : 'Wheezing Jinn',
    foeClass : 'Elementals'
  },
  {
    type : 'foeLikelihood',
    action : "Increased Likelyhood Foe",
    odds : 100,
    foe : 'Plaguebringer',
    foeClass : 'Titans'
  },/*{
    type : 'foeBonusToStats',
    action : "Increase Air",
    bonusPercent : .25,
    stats : ['air']
  }*/],
}

const attackOfTheElements = {
  eventName : "Attack of the Elements",
  description : "For twelve weeks, a new Elemental foe will be released in the game! During this time, there will be an increased chance to battle the new foe, as well as bonus Photon Tokens and XP for winning!",
  actionTypes : [{
    type : 'foeLikelihood',
    action : "Increased Likelyhood Foe",
    odds : 33,
    foe : 'Cyclonic Siren',
    foeClass : 'Elementals'
  },{
    type : 'ptBooster',
    action : "Increase PT Reward",
    // BOOSt tHIS TO 3.0 for t3
    bonusPercent : 2.0,
    requirements : [{ foeType : 'Cyclonic Siren' }]
  },{
    type : 'xpBooster',
    action : "Increase XP Reward",
    // BOOSt tHIS TO 1.5 for t3
    bonusPercent : 1.0,
    requirements : [{ foeType : 'Cyclonic Siren' }]
  }],
}

module.exports = { testSpecificFoe, attackOfTheElements };


