import { Op, Transaction } from "sequelize";
import { Avatar, Battle, Items } from "../../config/db";
import { determineItemEffects, determinePostBattleActions } from "./onGoToBattle";
import ALLPBAs from "../postBattleActions.json";
import { parseStats } from "../../lib/helperFunctions";
import HF from "../../types/herofit";
import { AllPbaTypes, BackendBattle, PBAType, PostBattleActions } from "../../types/BackendOnlyTypes";

// Used for inserting a battle for an individual user when they goToBattle
async function insertBattle(avatar: HF.Hero, foe: HF.Foe, t: Transaction) {
  try {
    const postBattleActions: PBAType[] = await new Promise((resolve, reject) => {
      return determinePostBattleActions(avatar, foe, resolve, reject);
    });

    const battleObj: BackendBattle = {
      owner: avatar.owner,
      avatarID: avatar.id,
      avatarName: avatar.name,
      foe,
      foeType: foe.type,
      avatar: parseStats(avatar, true) as HF.Hero,
      outcome: "TBD",
      seenReport: false,
      // If there are PBAs top consider post battle, add them here
      postBattleActions: postBattleActions.length ? postBattleActions : null,
      // If there are item effects that will impact battle, add them to initial battle record
      effects: determineItemEffects(avatar.equipped),
    };

    // Using findOrCreate now to prevent multiple battles
    const [battleInstance, wasCreated] = await Battle.findOrCreate({ where: { outcome: "TBD", avatarID: battleObj.avatarID }, defaults: battleObj, raw: true, transaction: t });
    if (!wasCreated) {
      throw new Error("Battle already in queue for hero");
    }

    // Get the items acquired from the action types in the battle report
    let rewards: string[] | null = null;
    if (postBattleActions) {
      rewards = postBattleActions.map(action => {
        let matchingPBA;

        for (let actionType in ALLPBAs as PostBattleActions) {
          const match = ALLPBAs[actionType as keyof PostBattleActions].find((pba: AllPbaTypes) => {
            return pba.action === action;
          });
          if (match) {
            matchingPBA = match;
            break;
          }
        }

        return matchingPBA.name;
      });
    }

    let matchingItems: HF.Item[] | null = null;
    // If potential rewards, get matching Items to present to user on goToBattle
    if (rewards) {
      matchingItems = await Items.findAll({
        attributes: ["type", "name", "description", "lore", "effects", "icon", "class", "exhaustible", "ptCost", "action"],
        where: { name: { [Op.in]: rewards } },
        transaction: t,
      });
    }

    return {
      goToBattle: true,
      foe,
      rewards: matchingItems,
    };
  } catch (error) {
    throw error;
  }
}

export default insertBattle;
