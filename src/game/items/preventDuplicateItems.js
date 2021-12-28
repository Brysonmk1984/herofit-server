const { AvatarItems, Items } = require("../../config/db");
const { Op } = require("sequelize");

// Check if a particular avatar already has items passed in itemsToCheck array (of item names)
function preventDuplicateItems(itemsToCheck, avatarId) {
  // if(!itemsToCheck.length){
  //   return [];
  // }
  // Should end up with [{ name : 'Black Belt', id : 28, false }, undefined, undefined, etc]
  let allItemMatches = [];
  return Items.findAll({
    attributes: ["name", "id"],
    where: { name: { [Op.in]: itemsToCheck }, exhaustible: false },
    raw: true,
  })
    .then(results => {
      //console.log('ALL RES', results);
      // results = array of objects { name : 'Black Belt', id : 28, false }
      // Order all matching items to the order of the itemsToCheck param
      allItemMatches = itemsToCheck.map(itemName => {
        const res = results.find(itemObj => itemObj.name === itemName);
        return res;
      });
      //console.log('ORDERED ALL ITEM MATCHES = ', allItemMatches);

      // Need to find all matching AvatarItems, so make array of just matching ids
      const itemIdArray = allItemMatches.map(avatarItem => (avatarItem ? avatarItem.id : undefined)).filter(Boolean);
      // Find all AvatarItems where avatarID and itemID match
      return AvatarItems.findAll({
        where: { avatarID: avatarId, itemID: { [Op.in]: itemIdArray } },
        raw: true,
      });
    })
    .then(results => {
      //console.log('THE RES', results);
      // Map over all item matches from earlier, and return array of AvatarItems that match each Item instance
      // Should end with an array of arrays = [[{ avatarID : 236, itemID : 21}],[],[{ avatarID : 236, itemID : 28}, { avatarID : 236, itemID : 28}]]
      const allAvItemTuple = allItemMatches.map(item => {
        return results.filter(avatarItem => item && item.id === avatarItem.itemID);
      });
      //console.log('ALL TUP', allAvItemTuple);
      // array of booleans that specify whether the hero already has a particular item
      const arrayOfBooleans = allAvItemTuple.map(tuple => (tuple.length ? true : false));

      // Returning valid items to insert that haven't already been earned / found
      return itemsToCheck.filter((itemName, i) => arrayOfBooleans[i] === false);
    })
    .catch(error => {
      console.log("error deduping", error);
      throw error;
    });
}

module.exports = preventDuplicateItems;
