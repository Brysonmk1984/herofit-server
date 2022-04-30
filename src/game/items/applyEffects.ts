import { col, literal, Transaction } from "sequelize";
import { Avatar, UserTotal } from "../../config/db";
import xpCalc from "../upgrades/xpCalc";
import avCalc from "../upgrades/avCalc";
import { COMPETITIVE_ACTIVITIES, NONCOMPETITIVE_ACTIVITIES, BASE_RECOVERY } from "../CONSTANTS";
import instantiateBattle from "../prebattle/instantiateBattle";
import HF from "../../types/herofit";
import { BackendUserTotals, HeroWithTransmutations, TransmutationType } from "../../types/BackendOnlyTypes";
import { parseStats } from "../../lib/helperFunctions";

// Retrocausal Capsule
async function resetHero(avatarID: number, email: string): Promise<HF.Hero> {
  try {
    const userTotals: BackendUserTotals = await UserTotal.findOne({ where: { user: email }, attributes: [...COMPETITIVE_ACTIVITIES, ...NONCOMPETITIVE_ACTIVITIES], raw: true });

    type AvatarAttrs =  { [x : TransmutationType] } & {
      health: number;
      maxHealth: number;
      activityXP: number;
      battleXP: number;
      character: HF.CharacterName;
      createdAt: string;
    }

    // GET AVATAR
    const avatar: AvatarAttrs = await Avatar.findOne({ attributes: ["health", "maxHealth", "activityXP", "battleXP", "character", "createdAt", "owner", "fireToWater","fireToEarth","fireToAir","waterToAir","waterToEarth","waterToFire","airToEarth","airToFire","airToWater","earthToWater","earthToAir","earthToFire" ], where: { id: avatarID } });
    const { health, maxHealth, activityXP, battleXP, character, createdAt } = avatar;

    const { getCurrentLevel } = xpCalc(activityXP, battleXP);
    const { total: heroLevel } = getCurrentLevel();

    // CALCULATE ATTRIBUTES BASED ON XP CURVE.
    const { updatePower, updateHealth, updateAether, updateElements, determineNetTransmutedElementalValues } = avCalc(userTotals);
    const updatedElms = updateElements(character, { qpFire: 0, qpEarth: 0, qpWater: 0, qpAir: 0 }, createdAt);
    const {transAir, transEarth, transFire, transWater} = determineNetTransmutedElementalValues(parseStats(avatar) as HeroWithTransmutations);

    const finalElms = {
      fire : updatedElms.fire + transFire,
      earth : updatedElms.earth + transEarth,
      air : updatedElms.air + transAir,
      water : updatedElms.water + transWater,
    }

    const updatedPower = updatePower(heroLevel, 0);
    const updatedAether = updateAether(heroLevel, 0);
    const { updatedMaxHealth, updatedHealth } = updateHealth(heroLevel, 0, health, maxHealth, "Rested", false, true);

    const updatedAttributes = {
      /* Hero Level minus one since level 1 doesn't count, * 5 for QP each level */
      /* +5 Signup bonus, +5 Strava Bonus */
      qp: (heroLevel - 1) * 5 + 5 + 5,
      power: updatedPower,
      maxHealth: updatedMaxHealth,
      armor: 0,
      recovery: BASE_RECOVERY,
      fire: finalElms.fire,
      earth: finalElms.earth,
      air: finalElms.air,
      water: finalElms.water,
      aether: updatedAether,
      qpPower: 0,
      qpHealth: 0,
      qpArmor: 0,
      qpRecovery: 0,
      qpFire: 0,
      qpEarth: 0,
      qpAir: 0,
      qpWater: 0,
      qpAether: 0,
      // Need to change health of avatar if it's over the amount of the new maxHealth
      health: updatedHealth > updatedMaxHealth ? updatedMaxHealth : updatedHealth,
    };

    // UPDATE & RETURN AVATAR
    const data = await Avatar.update(updatedAttributes, { where: { id: avatarID }, returning: true });

    return data[1][0];
  } catch (error) {
    throw error;
  }
}

// Health Potion
async function healCompletely(avatarID: number): Promise<HF.Hero> {
  try {
    const data = await Avatar.update({ health: col("maxHealth"), status: "Rested" }, { where: { id: avatarID }, returning: true });
    const avatar = data[1][0];
    avatar.restedEnough = true;
    //RETURN UPDATED AVATAR
    return avatar;
  } catch (error) {
    throw error;
  }
}

// Antidote Potion
async function removeInfected(avatarID: number): Promise<HF.Hero> {
  try {
    const data = await Avatar.update({ status: "Recovering", statusFade: 0 }, { where: { id: avatarID }, returning: true });
    //RETURN UPDATED AVATAR
    return data[1][0];
  } catch (error) {
    throw error;
  }
}

// Birthday Cake
async function setToHalfHealth(avatarID: number): Promise<HF.Hero> {
  try {
    const data = await Avatar.update({ health: literal(`"maxHealth" / 2`), status: "Recovering" }, { where: { id: avatarID }, returning: true });
    //RETURN UPDATED AVATAR
    return data[1][0];
  } catch (error) {
    throw error;
  }
}

// Smelling Salts
async function reviveToOneHealth(avatarID: number): Promise<HF.Hero> {
  try {
    const data = await Avatar.update({ health: 1, status: "Recovering" }, { where: { id: avatarID }, returning: true });
    //RETURN UPDATED AVATAR
    return data[1][0];
  } catch (error) {
    throw error;
  }
}


async function itemEffects(effects: HF.Effect[], avatarID: number, email: string, t: Transaction): Promise<HF.Hero> {
  /* 
    Still need to pass a transaction here after I refactor inventory.js
  */
  try {
    const effectPromises: Promise<any>[] = [];
    effects.forEach((effect: HF.Effect) => {
      switch (effect.name) {
        case "Reset Hero":
          effectPromises.push(resetHero(avatarID, email));
          break;
        case "Heal Hero Completely":
          effectPromises.push(healCompletely(avatarID));
          break;
        case "Remove Infected Status":
          effectPromises.push(removeInfected(avatarID));
        case "Distasteful Temptation":
          effectPromises.push(setToHalfHealth(avatarID));
          break;
        case "Revive":
          effectPromises.push(reviveToOneHealth(avatarID));
          break;
        case "Summon Storming Oni":
          effectPromises.push(instantiateBattle(avatarID, "Storming Oni", t));
          break;
        case "Summon Hulking Aggro Crag":
          effectPromises.push(instantiateBattle(avatarID, "Hulking Aggro Crag", t));
          break;
        case "Summon Scorching Archfiend":
          effectPromises.push(instantiateBattle(avatarID, "Scorching Archfiend", t));
          break;
        case "Summon High Priestess of the Tides":
          effectPromises.push(instantiateBattle(avatarID, "High Priestess of the Tides", t));
          break;
        case "Summon Plaguebringer":
          effectPromises.push(instantiateBattle(avatarID, "Plaguebringer", t));
          break;
        case "Summon Shadow-Self":
          effectPromises.push(instantiateBattle(avatarID, "Shadow-Self", t));
          break;
        default:
          break;
      }
    });

    // All promises return the Hero, so just return the first one since they're all the same
    const promiseData = await Promise.all<HF.Hero>(effectPromises);
    return promiseData[0];
  } catch (error) {
    throw error;
  }
}
module.exports = { itemEffects };
export { itemEffects };
