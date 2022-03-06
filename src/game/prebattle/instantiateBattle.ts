import { Op, Transaction } from "sequelize";
import { Items, db } from "../../config/db";
import xpCalc from "../upgrades/xpCalc";
import insertBattle from "./insertBattle";
import { findFoeTemplateByType, selectFoeTemplate, determineFoeWithStats } from "./foeFunctions";
import { parseStats } from "../../lib/helperFunctions";
import HF from "../../types/herofit";

// Used to insert a battle into the DB for both random midnight battles or item-instantiated battles
// FoeType is null unless an item created the battle
async function instantiateBattle(avatarID: number, foeType: HF.FoeType = null, t: Transaction) {
  const q = `
  SELECT id, avatars.name, avatars.character, avatars.qp, avatars.health, avatars."maxHealth", avatars.power, avatars.armor, avatars.fire, avatars.air, avatars.water, avatars.earth, avatars.aether, avatars.status, avatars."statusFade", avatars."activityXP", avatars."battleXP", avatars."battleWins", avatars."battleLosses", avatars."battleDraws", avatars."battleDkos", avatars."photonTokens", avatars.owner, equipped 
  FROM avatars
  LEFT OUTER JOIN (SELECT "avatarID", array_agg(json_build_object('equipped', equipped, 'itemID', "itemID")) AS equipped
    FROM avatar_items WHERE avatar_items.equipped=true group by 1) AS equipped ON(id="avatarID")
  WHERE avatars.id = $1
`;

  try {
    // GET AVATAR
    const results: HF.Hero = await db.query(q, { bind: [avatarID], plain: true });
    if (results.goToBattle) {
      throw new Error("Hero is already queued for another battle, please try again later.");
    }

    // Preparing avatar
    const avatar = parseStats(results) as HF.Hero;
    avatar.health = avatar.maxHealth;
    const equippedItemIds = avatar.equipped ? avatar.equipped.map(item => item.itemID) : [];

    const { getCurrentLevel } = xpCalc(avatar.activityXP, avatar.battleXP);
    const { total } = getCurrentLevel();

    // Getting Foe Template
    const foeTemplate = foeType ? findFoeTemplateByType(foeType) : selectFoeTemplate(total);

    // Adding stats to Foe
    const foeWithStats = determineFoeWithStats(avatar, foeTemplate, total);

    // Get corresponding items for avatar
    const items = await Items.findAll({ where: { id: { [Op.in]: equippedItemIds } }, transaction: t, attributes: ["id", "type", "name", "effects", "action"] });
    avatar.equipped = items;

    // Insert Battle into DB
    return await insertBattle(avatar, foeWithStats, t);
  } catch (error) {
    throw error;
  }
}

export default instantiateBattle;
