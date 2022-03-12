import { col, literal } from "sequelize";
import { Avatar, UserTotal } from "../../config/db";
import xpCalc from "../upgrades/xpCalc";
import avCalc from "../upgrades/avCalc";
import { COMPETITIVE_ACTIVITIES, NONCOMPETITIVE_ACTIVITIES, BASE_RECOVERY } from "../CONSTANTS";
import instantiateBattle from "../prebattle/instantiateBattle";
import HF from "../../types/herofit";
import { BackendUserTotals } from "../../types/BackendOnlyTypes";

// Retrocausal Capsule
async function resetHero(avatarID: number, email: string) {
  try {
    const userTotals: BackendUserTotals = await UserTotal.findOne({ where: { user: email }, attributes: [...COMPETITIVE_ACTIVITIES, ...NONCOMPETITIVE_ACTIVITIES], raw: true });

    interface AvatarAttrs {
      health: number;
      maxHealth: number;
      activityXP: number;
      battleXP: number;
      character: HF.CharacterName;
      createdAt: string;
    }

    // GET AVATAR
    const { health, maxHealth, activityXP, battleXP, character, createdAt }: AvatarAttrs = await Avatar.findOne({ attributes: ["health", "maxHealth", "activityXP", "battleXP", "character", "createdAt", "owner"], where: { id: avatarID } });

    const { getCurrentLevel } = xpCalc(activityXP, battleXP);
    const { total: heroLevel } = getCurrentLevel();

    // CALCULATE ATTRIBUTES BASED ON XP CURVE.
    const { updatePower, updateHealth, updateAether, updateElements } = avCalc(userTotals);
    const { fire: updatedFire, earth: updatedEarth, water: updatedWater, air: updatedAir } = updateElements(character, { qpFire: 0, qpEarth: 0, qpWater: 0, qpAir: 0 }, createdAt);
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
      fire: updatedFire,
      earth: updatedEarth,
      air: updatedAir,
      water: updatedWater,
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
async function healCompletely(avatarID: number) {
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
async function removeInfected(avatarID: number) {
  try {
    const data = await Avatar.update({ status: "Recovering", statusFade: 0 }, { where: { id: avatarID }, returning: true });
    //RETURN UPDATED AVATAR
    return data[1][0];
  } catch (error) {
    throw error;
  }
}

// Birthday Cake
async function setToHalfHealth(avatarID: number) {
  try {
    const data = await Avatar.update({ health: literal(`"maxHealth" / 2`), status: "Recovering" }, { where: { id: avatarID }, returning: true });
    //RETURN UPDATED AVATAR
    return data[1][0];
  } catch (error) {
    throw error;
  }
}

async function itemEffects(effects: HF.Effect[], avatarID: number, email: string) {
  /* 
    Still need to pass a transaction here after I refactor inventory.js
  */
  try {
    const effectPromises: Promise<HF.Hero>[] = [];
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
        case "Summon Storming Oni":
          effectPromises.push(instantiateBattle(avatarID, "Storming Oni"));
          break;
        case "Summon Hulking Aggro Crag":
          effectPromises.push(instantiateBattle(avatarID, "Hulking Aggro Crag"));
          break;
        case "Summon Scorching Archfiend":
          effectPromises.push(instantiateBattle(avatarID, "Scorching Archfiend"));
          break;
        case "Summon High Priestess of the Tides":
          effectPromises.push(instantiateBattle(avatarID, "High Priestess of the Tides"));
          break;
        case "Summon Plaguebringer":
          effectPromises.push(instantiateBattle(avatarID, "Plaguebringer"));
          break;
        case "Summon Shadow-Self":
          effectPromises.push(instantiateBattle(avatarID, "Shadow-Self"));
          break;
        default:
          break;
      }
    });

    return await Promise.all<HF.Hero>(effectPromises);
  } catch (error) {
    throw error;
  }
}

module.exports = { itemEffects };
