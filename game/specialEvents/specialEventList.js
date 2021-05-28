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

/*

DONT FORGET, FOR LVL 2 FOES, NEED TO CHANGE BONUS PERCENTS FOR XP & PT

*/

const attackOfTheElements = {
  eventName : "Attack of the Elements",
  description : "For twelve weeks, a new Elemental foe will be released in the game! During this time, there will be an increased chance to battle the new foe, as well as bonus Photon Tokens and XP for winning!",
  actionTypes : [{
    type : 'foeLikelihood',
    action : "Increased Likelyhood Foe",
    odds : 33,
    foe : 'Splash Artist',
    foeClass : 'Elementals'
  },{
    type : 'ptBooster',
    action : "Increase PT Reward",
    bonusPercent : 1.0,
    requirements : [{ foeType : 'Splash Artist' }]
  },{
    type : 'xpBooster',
    action : "Increase XP Reward",
    bonusPercent : .5,
    requirements : [{ foeType : 'Splash Artist' }]
  }],
}

module.exports = { testSpecificFoe, attackOfTheElements };


