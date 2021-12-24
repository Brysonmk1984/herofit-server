const { Items, AvatarItems } = require("../../config/db");
const { Op } = require("sequelize");
const chance = require("chance")();
const { specialEvent } = require("../../appConfig").config;
const { roundNumber, cloneObj } = require("../../lib/helperFunctions");
const {
  PTFIND_BASE_DROP_RATE,
  PTFIND_BASE_AMOUNT,
  PTFIND_EFFECTIVENESS_MOD,
} = require("../CONSTANTS");
const preventDuplicateItems = require("../items/preventDuplicateItems");
const { sendBackendOnlyEmail } = require("../../mail");

//ptFindStatBoost
function _calcPtBoost(ptFind) {
  if (!ptFind) {
    return {
      ptDropRate: PTFIND_BASE_DROP_RATE,
      ptDropAmount: PTFIND_BASE_AMOUNT,
    };
  }
  const retarder = ptFind / (ptFind + PTFIND_EFFECTIVENESS_MOD);
  // rate improvement as decimal
  const bonusPercentAsDecimal = roundNumber(
    (ptFind - Math.round(ptFind * retarder) * 0.01) * 0.01,
    4
  );
  const ptDropRate = roundNumber(
    PTFIND_BASE_DROP_RATE + PTFIND_BASE_DROP_RATE * bonusPercentAsDecimal,
    2
  );
  const ptDropAmount = roundNumber(
    PTFIND_BASE_AMOUNT + PTFIND_BASE_AMOUNT * bonusPercentAsDecimal,
    2
  );

  return {
    ptDropRate,
    ptDropAmount,
  };
}

// Expects a tuple where the first index is an array of items and the second is an array of weights for Likelihood of being selected
// Randomly & based on weights, pick from items and return selected
function _chanceItemFind(itemTuples, remainderPercent) {
  // itemTuples LOOKS SOMETHING LIKE: [['Health Potion', 'Antidote Potion'],[75,25]];
  //itemTuple gives exact percent chance for drop
  //console.log('ITEM TUPLES',itemTuples, 'REMAINDERPERCENT', remainderPercent);
  const foundItems = [];
  // run chance function on each percentage in second part of tuple
  itemTuples[1].forEach((likelihood, i) => {
    // If it's a remainder iteration, reduce likelihood by the remainderPercent * likelihood

    if (remainderPercent) {
      likelihood = roundNumber(likelihood * (remainderPercent * 0.01), 4);
      //console.log("likelihood in a remainder", likelihood);
    } else {
      //console.log("likelihood outside of a remainder", likelihood);
    }
    if (likelihood > 100 || likelihood < 0) {
      //console.log('SUMTING WONG with likelihood', likelihood);
      const error = new Error("Likelihood is inaccurate");
      sendBackendOnlyEmail(
        `Likelihood for itemFind exceeds boundaries - ${likelihood}`,
        error
      );
      throw error;
    }
    const foundThisItem = chance.bool({ likelihood });
    if (foundThisItem) {
      foundItems.push(itemTuples[0][i]);
    }
  });
  // Returns either null or an array of found items
  return foundItems;
}

// chance over an hour to find Photon Tokens within a range of values
function _chancePTFind(remainderPercent = null, ptDropRate, ptDropAmount) {
  const percentChance = remainderPercent
    ? remainderPercent * 0.01 * (ptDropRate * 0.01) * 100
    : ptDropRate;

  //console.log('IN PTFIND=', remainderPercent, 'PERCENT CHANCE', percentChance);
  const foundPt = chance.bool({ likelihood: percentChance });
  if (foundPt) {
    const ptAmount = chance.integer({
      min: ptDropAmount * 0.25,
      max: ptDropAmount * 1.75,
    });
    return ptAmount;
  }
  return null;
}

// Run ALL functions that check for various items
// weightedElms is an object of the elements with full percents of total workout
function _itemFind(
  level,
  remainderPercent,
  weightedElms,
  itemFindStatBoost,
  ptFindStatBoost,
  possibleItemDrops
) {
  //console.log('WEIGHTED ELMS', weightedElms);
  // If Special Event is live, run code to attempt any special item find event
  let eventItemFindBonusArray = [];
  if (specialEvent) {
    eventItemFindBonusArray = specialEvent.actionTypes.filter(
      (at) => at.type === "itemFind"
    );
  }

  // Run ALL item find functions here
  const generalItemTuple = [[], []];
  // For each item that drops in the game, determine the exact drop rate based on initial drop rate of item and any bonus to drop rate via specialEvents or itemFind stat
  // Level Restriction and disabled properties will prevent items from going into the pool of possible drop items
  possibleItemDrops.forEach((itemObj) => {
    const item = Object.assign({}, itemObj);

    // If item level is at least as high as hero level, add too tuple for potential item finds
    if (
      (item.levelRestriction === null || item.levelRestriction <= level) &&
      item.disabled === false
    ) {
      generalItemTuple[0].push(item.name);
      // NEED TO modify chance of find here based on event bonus and stat bonus
      // Special Event Item Find Bonus
      eventItemFindBonusArray.forEach((eventBonusObj) => {
        const matchingItem = eventBonusObj.items.find(
          (name) => name === item.name
        );
        if (matchingItem) {
          //console.log('MATCH = ', item.name,item.dropRate, eventBonusObj.bonusPercent, (item.dropRate *(eventBonusObj.bonusPercent)));
          // adjust item find chance of this item by the percent bonus
          item.dropRate += item.dropRate * eventBonusObj.bonusPercent;
          //console.log('IC=',item.dropRate);
        }
      });

      // Item Find - the stat bonus modifier
      // itemFindStatBoost is a percent (not decimal)
      if (itemFindStatBoost) {
        item.dropRate += item.dropRate * (itemFindStatBoost * 0.01);
      }

      // Further modify drop chance by activity ELM resitriction
      // Should take into account 2 things for drop chance: weightedElms (if activity restricted) & item.dropRate
      if (item.activityRestriction && item.activityRestriction.length) {
        // ACTIVITY RESTRICTED, INSERT ITEM BASED ON ITEM CHANCE * WEIGHT OF WORKOUT WITHIN ACTIVITY ELM TYPE
        let chanceToFind = 0;
        // an array of elms that the hero could possibly find items from
        item.activityRestriction.forEach((elm) => {
          // Total the possible chance from each element multiplied by item chance
          chanceToFind += weightedElms[elm] * 0.01 * item.dropRate;
        });
        //console.log('ACT RESTRICTED ', item.name, roundNumber(chanceToFind, 4));
        generalItemTuple[1].push(roundNumber(chanceToFind, 4));
      } else {
        //console.log('NOT ACT RESTRICTED ', item.name, item.dropRate);
        // NOT ACTIVITY RESTRICTED, INSERT ITEM BASED ON ITEM CHANCE ONLY
        generalItemTuple[1].push(item.dropRate);
      }
    }
  });
  //console.log('ITUPLE=', generalItemTuple);
  let foundItems = _chanceItemFind(generalItemTuple, remainderPercent);

  // Figures out the heroes adjusted pt drop rate and amount based on their ptFind stat
  const { ptDropRate, ptDropAmount } = _calcPtBoost(ptFindStatBoost);
  const ptFind = _chancePTFind(remainderPercent, ptDropRate, ptDropAmount);

  return {
    items: foundItems,
    pt: ptFind,
  };
}

// WORKS! - calls a function multiple times with the last time possibly being with a parameter that reduces likelihood of finding an item
function _callXTimes(
  func,
  integer,
  remainderPercent,
  level,
  weightedElms,
  itemFindStatBoost,
  ptFindStatBoost,
  possibleItemDrops
) {
  const acquiredItems = [];
  let ptFound = 0;
  // Loop over each full hours worth of activity and check if item was acquired
  for (let i = 0; i < integer; i++) {
    const result = func(
      level,
      null,
      weightedElms,
      itemFindStatBoost,
      ptFindStatBoost,
      possibleItemDrops
    );
    if (result.items) {
      acquiredItems.push(...result.items);
    }
    if (result.pt) {
      ptFound += result.pt;
    }
  }
  //console.log('INSIDEE', remainderPercent);
  // Check partial hour
  if (remainderPercent) {
    const result = func(
      level,
      remainderPercent,
      weightedElms,
      itemFindStatBoost,
      ptFindStatBoost,
      possibleItemDrops
    );
    if (result.items) {
      acquiredItems.push(...result.items);
    }
    if (result.pt) {
      ptFound += result.pt;
    }
  }
  return {
    items: acquiredItems,
    pt: ptFound,
  };
}

function activityItemFind(
  xpGain,
  level,
  weightedElms,
  itemFindStatBoost,
  ptFindStatBoost,
  possibleItemDrops,
  t
) {
  const activityItemSessions = xpGain / 60;
  const integer = Math.floor(activityItemSessions);
  const remainder = activityItemSessions % 1;
  const remainderPercent = remainder * 100;
  //console.log('Earlyy', integer, remainderPercent);
  const foundItemsAndPt = _callXTimes(
    _itemFind,
    integer,
    remainderPercent,
    level,
    weightedElms,
    itemFindStatBoost,
    ptFindStatBoost,
    possibleItemDrops
  );
  //console.log('DONE', foundItemsAndPt);
  return foundItemsAndPt;
}

function insertItemsFromItemFind(avatarID, itemsToInsert, t) {
  return preventDuplicateItems(itemsToInsert, avatarID)
    .then((dedupedItemFinds) => {
      return Items.findAll({
        attributes: { id: avatarID },
        where: { name: { [Op.in]: dedupedItemFinds } },
        raw: true,
      })
        .then((items) => {
          const avItems = items.map((item) => {
            return { avatarID, itemID: item.id };
          });

          // Insert all items earned from item find
          return AvatarItems.bulkCreate(avItems, { transaction: t })
            .then(() => {
              // Used for displaying rewards to user after level up only
              const foundItems = [];
              items.forEach((item) => {
                foundItems.push({
                  type: item.type,
                  name: item.name,
                  description: item.description,
                });
              });

              //console.log('AWARDS TO DISPLAY:', foundItems);
              return foundItems.map((item) => item.name);
            })
            .catch((error) => {
              console.log("ERROR WITH CREATING AVATAR ITEMS", error);
              throw error;
            });
        })
        .catch((error) => {
          console.log("ERROR FINDING ITEMS", error);
          throw error;
        });
    })
    .catch((error) => {
      console.log("ERROR PREVENTING DUPES", error);
      throw error;
    });
}

// private functions exported for tests
module.exports = {
  _callXTimes,
  _itemFind,
  _chancePTFind,
  activityItemFind,
  insertItemsFromItemFind,
};
