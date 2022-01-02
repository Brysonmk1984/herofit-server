const { col, literal } = require("sequelize");
const { Avatar, UserTotal } = require("../../config/db");
const xpCalc = require("../upgrades/xpCalc");
const avCalc = require("../upgrades/avCalc");
const { COMPETITIVE_ACTIVITIES, NONCOMPETITIVE_ACTIVITIES, BASE_RECOVERY } = require("../CONSTANTS");
const instantiateBattle = require("../prebattle/instantiateBattle");

// Retrocausal Capsule
function resetHero(avatarID, email) {
  let userTotals;
  // GET USER TOTALS
  return UserTotal.findOne({
    where: { user: email },
    attributes: [...COMPETITIVE_ACTIVITIES, ...NONCOMPETITIVE_ACTIVITIES],
    raw: true,
  })
    .then(ut => {
      userTotals = ut;
      // GET AVATAR
      return Avatar.findOne({
        attributes: ["health", "maxHealth", "activityXP", "battleXP", "character", "createdAt", "owner"],
        where: { id: avatarID },
      });
    })
    .then(({ health, maxHealth, activityXP, battleXP, character, createdAt }) => {
      const { getCurrentLevel } = xpCalc(activityXP, battleXP);
      const { total: heroLevel } = getCurrentLevel();

      // CALCULATE ATTRIBUTES BASED ON XP CURVE.
      const { updatePower, updateHealth, updateAether, updateElements } = avCalc(userTotals);
      const { fire: updatedFire, earth: updatedEarth, water: updatedWater, air: updatedAir } = updateElements(character, { qpFire: 0, qpEarth: 0, qpWater: 0, qpAir: 0 }, createdAt);
      const updatedPower = updatePower(heroLevel, 0);
      const updatedAether = updateAether(heroLevel, 0);
      const { updatedMaxHealth, updatedHealth } = updateHealth(heroLevel, 0, health, maxHealth, "rested", false, true);

      return {
        power: updatedPower,
        health: updatedHealth,
        maxHealth: updatedMaxHealth,
        fire: updatedFire,
        earth: updatedEarth,
        water: updatedWater,
        air: updatedAir,
        aether: updatedAether,
        heroLevel,
      };
    })
    .then(({ power, health, maxHealth, fire, earth, water, air, aether, heroLevel }) => {
      const updatedAttributes = {
        /* Hero Level minus one since level 1 doesn't count, * 5 for QP each level */
        /* +5 Signup bonus, +5 Strava Bonus */
        qp: (heroLevel - 1) * 5 + 5 + 5,
        power,
        maxHealth,
        armor: 0,
        recovery: BASE_RECOVERY,
        fire,
        earth,
        air,
        water,
        aether,
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
        health: health > maxHealth ? maxHealth : health,
      };

      // UPDATE AVATAR
      return Avatar.update(updatedAttributes, {
        where: { id: avatarID },
        returning: true,
      });
    })
    .then(data => {
      console.log("success!", data);
      //RETURN UPDATED AVATAR
      return data[1][0];
    })
    .catch(error => {
      console.log("error", error);
      return error;
    });
}

// Health Potion
function healCompletely(avatarID) {
  return Avatar.update({ health: col("maxHealth"), status: "Rested" }, { where: { id: avatarID }, returning: true })
    .then(data => {
      const avatar = data[1][0];
      avatar.restedEnough = true;
      //RETURN UPDATED AVATAR
      return avatar;
    })
    .catch(error => {
      console.log("error", error);
      return error;
    });
}

// Antidote Potion
function removeInfected(avatarID) {
  return Avatar.update({ status: "Recovering" }, { where: { id: avatarID }, returning: true })
    .then(data => {
      //RETURN UPDATED AVATAR
      return data[1][0];
    })
    .catch(error => {
      console.log("error", error);
      return error;
    });
}

// Birthday Cake
function setToHalfHealth(avatarID) {
  return Avatar.update({ health: literal(`"maxHealth" / 2`), status: "Recovering" }, { where: { id: avatarID }, returning: true })
    .then(data => {
      //RETURN UPDATED AVATAR
      return data[1][0];
    })
    .catch(error => {
      console.log("error", error);
      return error;
    });
}

function itemEffects(effects, avatarID, email) {
  const effectPromises = [];
  effects.forEach(effect => {
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
  return Promise.all(effectPromises)
    .then(results => {
      results.forEach(result => {
        if (result.error) {
          throw result.error;
        }
      });
      return results;
    })
    .catch(error => {
      return { error };
    });
}

module.exports = { itemEffects };
