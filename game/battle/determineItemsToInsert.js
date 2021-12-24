const ALLPBAs = require("../postBattleActions.json");

function determineItemsToInsert(postBattleActions, battleOutcome) {
  if (postBattleActions === null) {
    return [];
  }
  // ALL PBAs FROM BATTLE
  const itemsToInsert = postBattleActions.map(ACTION => {
    let matchingPBA;
    // FOR EACH ACTION TYPE WITHIN THE postBattleActions JSON file.
    // ACTION TYPES = WINTOTAL, WINSTREAK, DEFEATEDFOE
    for (let actionType in ALLPBAs) {
      // Find the PBA that matches the pba.action property
      let matching = ALLPBAs[actionType].find(pba => {
        return pba.action === ACTION;
      });

      // If there's a match, assign the entire matching PBA to a variable that we'll use to get the actual item
      if (matching) {
        // Usually a win is required, but might be DKO. In the future will have some for Draws and losses
        const matchesOutcomeCondition = matching.outcome.includes(battleOutcome);
        if (matchesOutcomeCondition) {
          matchingPBA = matching;
          break;
        }
      }
    }

    // There should always be a matchingPBA here, if not, I forgot to add one to the postBattleActions.json
    if (matchingPBA) {
      // Push the ITEM that matches a PBA that matches the ACTION, along with the avatarID, into an array
      return matchingPBA.name;
    }
  });
  // Will return either the array of items or an empty array
  return itemsToInsert.filter(Boolean);
}

module.exports = determineItemsToInsert;
