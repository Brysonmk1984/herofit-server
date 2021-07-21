const testSpecificFoe = {
  eventName : "Test Specific Foe",
  description : "Used for selecting a specific foe",
  actionTypes : [{
    type : 'foeLikelihood',
    action : "Increased Likelihood Foe",
    odds : 0,
    foe : 'Wheezing Jinn',
    foeClass : 'Elementals'
  },
  {
    type : 'foeLikelihood',
    action : "Increased Likelihood Foe",
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
    type : 'ptBooster',
    action : "Increase PT Reward",
    bonusPercent : 3.0,
    requirements : [{ foeType : 'High Priestess of the Tides' }]
  },{
    type : 'xpBooster',
    action : "Increase XP Reward",
    bonusPercent : 3.0,
    requirements : [{ foeType : 'High Priestess of the Tides' }]
  },
  {
    type : 'itemFind',
    action : "Increased Likelihood Item",
    bonusPercent : 3.0,
    items : ['Wave-Swept Battle Conch'],
  }
],
}

module.exports = { testSpecificFoe, attackOfTheElements };


