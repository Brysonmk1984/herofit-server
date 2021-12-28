interface ObjectWithAnyProperties {
  [key: string]: any;
}
function cloneObj(obj: ObjectWithAnyProperties, deep = false) {
  var result: ObjectWithAnyProperties = {};
  for (let key in obj) {
    if (deep && obj[key] instanceof Object) {
      if (obj[key] instanceof Array) {
        result[key] = [];
        obj[key].forEach(function (item: unknown) {
          if (item instanceof Object) {
            result[key].push(cloneObj(item, true));
          } else {
            result[key].push(item);
          }
        });
      } else {
        result[key] = cloneObj(obj[key]);
      }
    } else {
      result[key] = obj[key];
    }
  }
  return result;
}

const shuffleArray = function (array: any[]) {
  var currentIndex: number = array.length,
    temporaryValue: number,
    randomIndex: number;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
};

// function parseAvatarProperties(avatar, wholeNumbers = false) {
//   const attrsToBeParsed = ["fire", "earth", "air", "water", "armor", "recovery", "aether"];

//   for (let attr in avatar) {
//     let toBeParsed = attrsToBeParsed.includes(attr);
//     if (toBeParsed) {
//       avatar[attr] = wholeNumbers ? Math.floor(JSON.parse(avatar[attr]).toFixed(0)) : JSON.parse(avatar[attr]);
//     }
//   }
//   return avatar;
// }

// function parseActivityData(act) {
//   const propertiesToBeParsed = ["elevationGain", "maxSpeed", "averageSpeed", "duration", "distance"];
//   for (let property in act) {
//     if (propertiesToBeParsed.includes(property) && typeof act[property] !== null) {
//       act[property] = parseFloat(act[property]);
//     }
//   }
//   return act;
// }

// function arrayChunker(inputArray, perChunk) {
//   return inputArray.reduce((resultArray, item, index) => {
//     const chunkIndex = Math.floor(index / perChunk);
//     if (!resultArray[chunkIndex]) {
//       resultArray[chunkIndex] = []; // start a new chunk
//     }
//     resultArray[chunkIndex].push(item);
//     return resultArray;
//   }, []);
// }

// function getRandomNumber(length) {
//   return Math.floor(Math.pow(10, length - 1) + Math.random() * 9 * Math.pow(10, length - 1));
// }

// const paginate = (query, { page, pageSize }) => {
//   const offset = page * pageSize;
//   const limit = pageSize;
//   return { ...query, limit, offset };
// };

// function adjustActivityMinutes(minutes, activityType, timeAndHalfActivities) {
//   const isTimeAndHalf = timeAndHalfActivities.includes(activityType);
//   if (isTimeAndHalf) {
//     return minutes * 1.5;
//   }
//   return minutes;
// }

// function stackItems(allItems) {
//   const stackedItems = [];
//   allItems.forEach(item => {
//     const alreadyIncluded = stackedItems.find(stackedItem => item.name === stackedItem.name);
//     if (alreadyIncluded) {
//       alreadyIncluded.count++;
//     } else {
//       item.count = 1;
//       stackedItems.push(item);
//     }
//   });

//   return stackedItems;
// }

// // Used by The Poltergeist and Octopus to mix up all non zero stats of a hero or foe
// function scrambleStats(possibleStats, objectWithStats) {
//   const stats = possibleStats.filter(stat => {
//     if (objectWithStats[stat] > 0) {
//       return true;
//     }
//     return false;
//   });
//   let modifiedObjectWithStats = { ...objectWithStats };
//   const scrambledStats = {};

//   stats.forEach(stat => {
//     const isGreaterThanZero = objectWithStats[stat] > 0;
//     if (isGreaterThanZero) {
//       scrambledStats[stat] = undefined;
//     }
//   });

//   for (let stat in scrambledStats) {
//     const randomStat = stats[Math.floor(Math.random() * stats.length)];
//     const statPosition = stats.findIndex(s => s === randomStat);
//     const statVal = stats.splice(statPosition, 1);
//     scrambledStats[stat] = Math.floor(objectWithStats[statVal[0]]);
//   }
//   return Object.assign({}, modifiedObjectWithStats, scrambledStats);
// }

// //to round to n decimal places
// function roundNumber(num, places) {
//   var multiplier = Math.pow(10, places);
//   return Math.round(num * multiplier) / multiplier;
// }

// function range(start, end) {
//   return Array(end - start + 1)
//     .fill()
//     .map((_, idx) => start + idx);
// }

module.exports = {
  cloneObj,
  // parseAvatarProperties,
  // parseActivityData,
  // arrayChunker,
  // getRandomNumber,
  // paginate,
  // adjustActivityMinutes,
  // stackItems,
  // scrambleStats,
  // roundNumber,
  // range,
};
