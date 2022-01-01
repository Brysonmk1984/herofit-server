import { ObjectWithAnyProperties } from "../types/BackendOnlyTypes";
import HF from "../types/herofit";
import { includes } from "../types/typeguards";

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
  let currentIndex: number = array.length,
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

// Converts some Hero Properties strom strings to floating point numbers
function parseAvatarProperties(avatar: ObjectWithAnyProperties, wholeNumbers = false) {
  const attrsToBeParsed: Lowercase<HFF.Stat>[] = ["fire", "earth", "air", "water", "armor", "recovery", "aether"];

  for (let attr in avatar) {
    let toBeParsed = attrsToBeParsed.includes(attr as Lowercase<HF.Stat>);
    if (toBeParsed) {
      avatar[attr] = wholeNumbers ? Math.floor(avatar[attr]) : parseFloat(avatar[attr]);
    }
  }
  return avatar as HF.Hero;
}

// Convert activity properties which come from the DB as strings to floating point numbers
function parseActivityData(act: ObjectWithAnyProperties) {
  const propertiesToBeParsed = ["elevationGain", "maxSpeed", "averageSpeed", "duration", "distance"] as const;
  for (let property in act) {
    type ActDataToBeParsed = typeof propertiesToBeParsed[number];
    const actProperty = property as ActDataToBeParsed;
    if (propertiesToBeParsed.includes(actProperty) && typeof act[actProperty] !== null) {
      act[actProperty] = parseFloat(act[actProperty]);
    }
  }
  return act as HF.Activity;
}

function arrayChunker(inputArray: any[], perChunk: number) {
  return inputArray.reduce((resultArray, item, index) => {
    const chunkIndex = Math.floor(index / perChunk);
    if (!resultArray[chunkIndex]) {
      resultArray[chunkIndex] = []; // start a new chunk
    }
    resultArray[chunkIndex].push(item);
    return resultArray;
  }, []);
}

function getRandomNumber(length: number) {
  return Math.floor(Math.pow(10, length - 1) + Math.random() * 9 * Math.pow(10, length - 1));
}

const paginate = (query: ObjectWithAnyProperties, { page, pageSize }: { page: number; pageSize: number }) => {
  const offset = page * pageSize;
  const limit = pageSize;
  return { ...query, limit, offset };
};

type TimeAndHalfActs = "stairStepper" | "elliptical" | "swim" | "crossfit" | "run";
function adjustActivityMinutes(minutes: number, activityType: string, timeAndHalfActivities: TimeAndHalfActs[]) {
  if (includes(timeAndHalfActivities, activityType)) {
    return minutes * 1.5;
  }

  return minutes;
}

function stackItems(allItems: HF.Item[]) {
  const stackedItems: HF.Item[] = [];
  allItems.forEach(item => {
    const alreadyIncluded = stackedItems.find(stackedItem => item.name === stackedItem.name);

    if (alreadyIncluded) {
      alreadyIncluded.count++;
    }
    item.count = 1;
    stackedItems.push(item);
  });

  return stackedItems;
}

// Used by The Poltergeist and Octopus to mix up all non zero stats of a hero or foe
function scrambleStats(possibleStats: Lowercase<HF.Stat>[], objectWithStats: ObjectWithAnyProperties) {
  const stats = possibleStats.filter(stat => {
    if (objectWithStats[stat] > 0) {
      return true;
    }
    return false;
  });
  let modifiedObjectWithStats = { ...objectWithStats };
  const scrambledStats: ObjectWithAnyProperties = {};

  stats.forEach(stat => {
    const isGreaterThanZero = objectWithStats[stat] > 0;
    if (isGreaterThanZero) {
      scrambledStats[stat] = undefined;
    }
  });

  for (let stat in scrambledStats) {
    const randomStat = stats[Math.floor(Math.random() * stats.length)];
    const statPosition = stats.findIndex(s => s === randomStat);
    const statVal = stats.splice(statPosition, 1);
    scrambledStats[stat] = Math.floor(objectWithStats[statVal[0]]);
  }
  return Object.assign({}, modifiedObjectWithStats, scrambledStats);
}

// To round to n decimal places
function roundNumber(num: number, places: number) {
  var multiplier = Math.pow(10, places);
  return Math.round(num * multiplier) / multiplier;
}

// Fill out an array that's a range of the passed in start and end numbers
function range(start: number, end: number) {
  return Array(end - start + 1)
    .fill(0)
    .map((_, idx) => start + idx);
}

export { cloneObj, parseAvatarProperties, parseActivityData, arrayChunker, getRandomNumber, paginate, adjustActivityMinutes, stackItems, scrambleStats, roundNumber, range };
