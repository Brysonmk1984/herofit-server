const chance = require('chance')();
const villains = require('../villains.json');

const handleChanceForFoe = function({ eventName, foeActions, foes}){
  console.log('CAKE-',eventName, foeActions, foes);

  const encounter33Percent = foeActions.includes("Increased Likelyhood Foe 33");

  if(encounter33Percent){console.log(1);
    const battleSpecialEventFoe = chance.bool({ likelihood: 99 });
    if(eventName === 'Elemental Ambush'){console.log(11);
      if(battleSpecialEventFoe){console.log(111);
        return villains.Elementals.find(foe => foe.type === foes[0]);
      }
    }
  }


  return null;
}

module.exports =  { handleChanceForFoe };