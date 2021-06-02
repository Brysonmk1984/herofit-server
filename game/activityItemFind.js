const chance = require('chance')();
const { ELM_LEVEL_3_REQ } = require('./CONSTANTS');

function _goldFind(){

}

// will possibly return a level 3 item acquired based on a 10% chance for a full hour's worth of activity
// Second parameter is optional and represents a percentChance lower than 10 which is for partial hours
function _elmLvl3Items(level, percentChance = 10){
  const elmLvl3Items = ['Storm Crow Bone Chimes', 'Smoldering Skull Torch', 'Wave-Swept Battle Conch', 'Petrified Power Totem'];

  if(level >= ELM_LEVEL_3_REQ){
    const foundItem = chance.bool({ likelihood : percentChance });
    if(foundItem){
      const item = chance.pickone(elmLvl3Items);
      return item;
    }
  }
  return null;
}

// function _itemFind(level){
//   console.log('ARGS= ', arguments);
//   const allFoundItems = [];
//   const elmLvl3BossItem =  _elmLvl3Items(level);
//   elmLvl3BossItem ? allFoundItems.push(elmLvl3BossItem) : null;

// }

// WORKS! - calls a function multiple times with the last time possibly being with a parameter that reduces likelihood of finding an item
function _callXTimes(func, count){
  const integer = Math.floor(count);
  const remainder =  count % 1;
  const remainderPercent = remainder * 100;
  const acquiredItems = [];
  
  // Loop over each full hours worth of activity and check if item was acquired
  for(let i = 0; i < integer; i++){
    const result = func();
    if(result){
      acquiredItems.push(result);
    }
  }

  // Check partial hour
  if(remainder){
    const result = func(remainderPercent);
    if(result){
      acquiredItems.push(result);
    }
  }

  return acquiredItems.length ? acquiredItems : null;
}

// function activityItemFind(xpGain, level){
//   const activityItemSessions = xpGain / 60;

//   const acquiredItems =  _callXTimes(() => _itemFind(level), activityItemSessions);

//   return acquiredItems;
// }

module.exports = { _elmLvl3Items, _callXTimes };
//module.exports = activityItemFind;