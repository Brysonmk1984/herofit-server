const chance = require('chance')();
const { ELM_LEVEL_3_REQ } = require('./CONSTANTS');

// Used for randomly selecting items based on elements exercised during activities
function _pickElementSpecificItem(weightedElms, itemTupleArray){
  // select the elm based on weighted average
  const selectedElm = chance.weighted(['fire', 'earth', 'water', 'air'], [weightedElms.fire, weightedElms.earth, weightedElms.water, weightedElms.air]);      
  // grab the array of element-matching items
  const listOfMatchingElmItems = itemTupleArray.find(tuple => tuple[0] === selectedElm);
  // pick one from element-matching items
  return chance.pickone(listOfMatchingElmItems[1]);
}

// Expects a tuple where the first index is an array of items and the second is an array of weights for likelyhood of being selected
// Randomly & based on weights, pick from items and return selected
function _pickFromGeneralItems(itemTuple, remainderPercent){
  // 3% chance per hour to find a general item
  const GENERALITEMCHANCE = { percent : 3, decimal : .03 };
  const percentChance = remainderPercent ? ((remainderPercent * .01) * GENERALITEMCHANCE.decimal) * 100 : GENERALITEMCHANCE.percent;
  const foundItem = chance.bool({ likelihood : percentChance });
  if(foundItem){
    // select the item based on weights
    return chance.weighted(itemTuple[0], itemTuple[1]);
  }
  return null;
}

// 25% chance over an hour to find Photon Tokens within a range of values
function _ptFind(remainderPercent = null){

  const CHANCETOFINDPT = { percent : 33, decimal : .33 };
  const percentChance = remainderPercent ? ((remainderPercent * .01) * CHANCETOFINDPT.decimal) * 100 : CHANCETOFINDPT.percent;
  const PTFINDBASE = 15;
  //console.log('IN PTFIND=', remainderPercent, 'PERCENT CHANCE', percentChance);

  const foundItem = chance.bool({ likelihood : percentChance });
  
  if(foundItem){
    const ptAmount = chance.integer({ min : PTFINDBASE * .25, max : PTFINDBASE * 1.75 });
    //console.log(ptAmount);
    return ptAmount;
  }
  return null;
}

// will possibly return a level 3 item acquired based on a 10% chance for a full hour's worth of activity
// Second parameter is optional and represents a percentChance lower than 10 which is for partial hours
function _elmLvl3Items(level, remainderPercent, weightedElms){
  // If a remainderPercent is passed in, it means only a fraction of the whole 6% chance should be used in the calculation,
  // Multiplied by .01 to get decimal value, then multiplied by the decimal value of the base chance (.06), and finally multiplied by 100 to get the non-decimal percent value for this partial hour
  const T3ITEMCHANCE = { percent : 6, decimal : .06 };
  const percentChance = remainderPercent ? ((remainderPercent * .01) * T3ITEMCHANCE.decimal) * 100 : T3ITEMCHANCE.percent;
  //console.log(percentChance);
  // Only test for lvl 3 elm item if player is over level 30
  if(level >= ELM_LEVEL_3_REQ){
    const foundItem = chance.bool({ likelihood : percentChance });
    // Small chance to find elemental lvl 3 item to begin with
    if(foundItem){
      const elmLvl3Items = [
        ['air',['Storm Crow Bone Chimes']],
        ['fire',['Smoldering Skull Torch']],
        ['water',['Wave-Swept Battle Conch']],
        ['earth',['Petrified Power Totem']]
      ];

      // return result of function that takes in weighted elms, and an array of items to pick from for each element
      return _pickElementSpecificItem(weightedElms, elmLvl3Items);
    }
  }
  return null;
}

// Run ALL functions that check for various items
function _itemFind(level, remainderPercent, weightedElms){
  const allFoundItems = [];
  // Run ALL item find functions here
  const elmLvl3BossItem =  _elmLvl3Items(level, remainderPercent, weightedElms);
  const generalItemTuple = [['Health Potion', 'Antidote Potion'],[75,25]];
  const generalItem = _pickFromGeneralItems(generalItemTuple, remainderPercent);
  const ptFind =  _ptFind(remainderPercent);
  //console.log('PT=', ptFind);
  elmLvl3BossItem ? allFoundItems.push(elmLvl3BossItem) : null;
  generalItem ? allFoundItems.push(generalItem) : null;
  return {
    items : allFoundItems.length ? allFoundItems : null,
    pt : ptFind
  }
}

// WORKS! - calls a function multiple times with the last time possibly being with a parameter that reduces likelihood of finding an item
function _callXTimes(func, integer, remainderPercent, level, weightedElms){

  //console.log('REMIND PERC=', remainderPercent, 'INTEGER', integer, 'REMAINDERPERCENT', remainderPercent);
  
  const acquiredItems = [];
  let ptFound = 0;
  // Loop over each full hours worth of activity and check if item was acquired
  for(let i = 0; i < integer; i++){
    const result = func(level, null, weightedElms);
    if(result.items){
      acquiredItems.push(...result.items);
    }
    if(result.pt){
      ptFound += result.pt;
    }
  }

  // Check partial hour
  if(remainderPercent){
    const result = func(level, remainderPercent, weightedElms);
    if(result.items){
      acquiredItems.push(...result.items);
    }
    if(result.pt){
      ptFound += result.pt
    }
  }
  //console.log('AI = ',acquiredItems);
  //return acquiredItems.length ? acquiredItems : null;
  return {
    items : acquiredItems.length ? acquiredItems : null,
    pt : ptFound
  }
}

function activityItemFind(xpGain, level, weightedElms){
  //console.log('XP GIAN', xpGain);
  const activityItemSessions = xpGain / 60;
  const integer = Math.floor(activityItemSessions);
  const remainder =  activityItemSessions % 1;
  const remainderPercent = remainder * 100;
  const foundItemsAndPt =  _callXTimes(_itemFind, integer, remainderPercent, level, weightedElms);

  return foundItemsAndPt;
}

module.exports = activityItemFind;

// testing
//module.exports = { _elmLvl3Items, _callXTimes, _itemFind, _ptFind, activityItemFind };
