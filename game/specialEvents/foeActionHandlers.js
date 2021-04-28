const chance = require('chance')();
const villains = require('../villains.json');

const handleChanceForFoe = function({ eventName, foeActions, foes}){
  console.log('CAKE-',eventName, foeActions, foes);

  const encounterLikeliness = foeActions.includes("Increased Likelyhood Foe");

  if(encounterLikeliness){
    if(eventName === 'Elemental Ambush'){
      const battleSpecialEventFoe = chance.bool({ likelihood: 33 });
      if(battleSpecialEventFoe){
        return villains.Elementals.find(foe => foe.type === foes[0]);
      }
    }
  }


  return null;
}

module.exports =  { handleChanceForFoe };