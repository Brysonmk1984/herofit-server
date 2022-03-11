import { Op } from "sequelize";
import { AvatarItems, Items } from "../../config/db";
import { BackendAvatarItems } from "../../types/BackendOnlyTypes";

// Check if a particular avatar already has items passed in itemsToCheck array (of item names)
async function preventDuplicateItems(itemsToCheck: string[], avatarId: number) {
  try {
    const results: { name: string; id: number }[] = await Items.findAll({ attributes: ["name", "id"], where: { name: { [Op.in]: itemsToCheck }, exhaustible: false }, raw: true });

    // Order all matching items to the order of the itemsToCheck param
    const allItemMatches = itemsToCheck.map(itemName => {
      const res = results.find(itemObj => itemObj.name === itemName);
      return res;
    });
    //console.log('ORDERED ALL ITEM MATCHES = ', allItemMatches);

    // Need to find all matching AvatarItems, so make array of just matching ids
    const itemIdArray = allItemMatches.map(avatarItem => (avatarItem ? avatarItem.id : undefined)).filter(Boolean);

    // Find all AvatarItems where avatarID and itemID match
    const avatarItems: BackendAvatarItems[] = await AvatarItems.findAll({ where: { avatarID: avatarId, itemID: { [Op.in]: itemIdArray } }, raw: true });

    // Map over all item matches from earlier, and return array of AvatarItems that match each Item instance
    // Should end with an array of arrays = [[{ avatarID : 236, itemID : 21}],[],[{ avatarID : 236, itemID : 28}, { avatarID : 236, itemID : 28}]]
    const allAvItemTuple = allItemMatches.map(item => {
      return avatarItems.filter(avatarItem => item && item.id === avatarItem.itemID);
    });

    // array of booleans that specify whether the hero already has a particular item
    const arrayOfBooleans = allAvItemTuple.map(tuple => (tuple.length ? true : false));
    //console.log(arrayOfBooleans, itemsToCheck.filter((itemName, i) => arrayOfBooleans[i] === false));

    // Returning valid items to insert that haven't already been earned / found
    return itemsToCheck.filter((itemName, i) => arrayOfBooleans[i] === false);
  } catch (error) {
    throw error;
  }
}

export default preventDuplicateItems;
module.exports = preventDuplicateItems;
