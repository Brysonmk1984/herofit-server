const testSpecificFoe = {
  eventName : "Test Specific Foe",
  description : "Used for selecting a specific foe",
  actionTypes : [{
    type : 'foeLikelihood',
    action : "Increased Likelihood Foe",
    odds : 100,
    foe : 'Specter',
    foeClass : 'Spirits'
  },
  {
    type : 'foeLikelihood',
    action : "Increased Likelihood Foe",
    odds : 0,
    foe : 'Storming Oni',
    foeClass : 'Elementals'
  },{
    type : 'foeBonusToStats',
    action : "Increase Air",
    bonusPercent : .50,
    stats : ['air']
  }],
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

const helloween = {
  eventName : "Helloween",
  description : "Until Halloween, bonus chance to face the Guardian of the Depths",
  actionTypes : [{
    type : 'foeLikelihood',
    action : "Increased Likelihood Foe",
    odds : 13,
    foe : 'Guardian of the Depths',
    foeClass : 'Titans',
    levelRequirement : 40
  }]
}

const appWelcome = {
  eventName : "App Welcome",
  description : "For the first month after launch, users who install the app will receive the white rabbit for free.",
  actionTypes : [{
    type : 'onAuth',
    itemID : 111
  }]
}

module.exports = { testSpecificFoe, attackOfTheElements, helloween, appWelcome };


