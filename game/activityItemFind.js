const chance = require('chance')();
const { ELM_LEVEL_3_REQ } = require('./CONSTANTS');

function _goldFind(){

}

// will possibly return a level 3 item acquired based on a 10% chance for a full hour's worth of activity
// Second parameter is optional and represents a percentChance lower than 10 which is for partial hours
function _elmLvl3Items(level, remainderPercent){
  const elmLvl3Items = ['Storm Crow Bone Chimes', 'Smoldering Skull Torch', 'Wave-Swept Battle Conch', 'Petrified Power Totem'];
  //console.log('LOOK=',level, remainderPercent);
  // If a remainderPercent is passed in, it means only a fraction of the whole 6% chance should be used in the calculation,
  // Multiplied by .01 to get decimal value, then multiplied by the decimal value of the base chance (.06), and finally multiplied by 100 to get the non-decimal percent value for this partial hour
  const percentChance = remainderPercent ? ((remainderPercent * .01) * .06) * 100 : 6;
  //console.log(percentChance);
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