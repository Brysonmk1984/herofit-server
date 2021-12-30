const { User, UserActivity, UserTotal, Avatar, Items } = require("../../config/db");
const db = require("../../config/db").db;
const { Op } = require("sequelize");
const moment = require("moment");
const crypto = require("crypto");
const { parseAvatarProperties, range } = require("../../lib/helperFunctions");
const { COMPETITIVE_ACTIVITIES, NONCOMPETITIVE_ACTIVITIES, MAX_LEVEL } = require("../CONSTANTS");
const utCalc = require("../upgrades/utCalc");
const avCalc = require("../upgrades/avCalc");
const xpCalc = require("../upgrades/xpCalc");
const { activityItemFind, insertItemsFromItemFind } = require("./activityItemFind");
const { activityStatRewards, activityLevelRewards, determineStatImprovements } = require("./activityRewards");
const activityHeal = require("./activityHeal");
const { sendCronErrorEmail } = require("../../mail");

// If id Is passed in, use it, but if it's a herofit source, then we need to create a new id for the activity
function _determineActivityId(id, source) {
  if (source === "herofit") {
    return `hf-${crypto.randomBytes(5).toString("hex")}`;
  } else if (id) {
    return id;
  }
  throw new Error("No activityId supplied");
}

// Need to adjust the date and activityId, and add email in preparation for DB insertion
function _prepareActivitiesForDb(email, activities) {
  // Need latest Activity to be added to user's account
  let latestActivityUpdate;
  const activityEntries = activities.map(activity => {
    const activityDate = moment.utc(activity.start_date);
    const activityId = _determineActivityId(activity.id, activity.source);

    // Check for latest activity (doesn't include DB activities)
    if (!latestActivityUpdate || activityDate.isAfter(moment.utc(latestActivityUpdate))) {
      latestActivityUpdate = moment.utc(activity.start_date).format("YYYY-MM-DD HH:mm:ss");
    }

    return {
      user: email,
      type: activity.type,
      averageSpeed: activity.averageSpeed,
      maxSpeed: activity.maxSpeed,
      distance: activity.distance,
      duration: activity.duration,
      elevationGain: activity.elevationGain,
      source: activity.source,
      activityDate: activity.activityDate,
      activityId: activityId.toString(),
    };
  });

  return { activityEntries, latestActivityUpdate };
}

function _dedupActivities(activities, t) {
  const actIdArray = activities.map(act => act.activityId.toString());
  return UserActivity.findAll({
    attributes: ["activityId"],
    where: { activityId: { [Op.in]: actIdArray } },
    transaction: t,
  })
    .then(duplicateActivities => {
      const duplicateActivityIds = duplicateActivities.map(act => act.activityId);
      //console.log('THE activityIds of the duplicate activities', duplicateActivityIds);

      // duplicateActivityIds is an array of activities that are confirmed already in the DB
      // we want to exclude all 'activities' that match these ids.
      return activities.filter(act => {
        // Only return activities that are not in the duplicateActivityId array
        return !duplicateActivityIds.includes(act.activityId);
      });
    })
    .catch(error => {
      console.log("ERROR-", error);
      throw error;
    });
}

// UPDATE USER, USERACTIVIES, & GET USERTOTALS BEFORE ANYTHING ELSE
async function _insertActivityData(email, activities, t) {
  // In the future, consider pushing back the latestActivityUpdate determination until after the dedup
  // Prepare activities for DB
  const { activityEntries, latestActivityUpdate } = _prepareActivitiesForDb(email, activities);
  //console.log(activityEntries);
  // Dedup any activities that conflict with entries in the DB
  const dedupedEntries = await _dedupActivities(activityEntries, t);
  //console.log('DEDUPED!', dedupedEntries);
  if (dedupedEntries.length === 0) {
    throw new Error("Duplicate Activity Entry, couldn't update Hero!");
  }
  const allPromises = [
    // Update latestActivity Date on USER
    User.update({ latestActivityUpdate }, { where: { email }, transaction: t }),
    // Insert All activities
    UserActivity.bulkCreate(dedupedEntries, {
      ignoreDuplicates: true,
      returning: true,
      transaction: t,
    }),
    // Find matching User Totals
    UserTotal.findOne({
      attributes: [...COMPETITIVE_ACTIVITIES, ...NONCOMPETITIVE_ACTIVITIES],
      where: { user: email },
      raw: true,
      transaction: t,
    }),
  ];

  return Promise.allSettled(allPromises);
}

// UPDATE USER TOTALS
async function _handleUserTotalsUpdate(email, hasBeenUpgraded, updatedActivities, accountDate, userTotals, t) {
  if (!userTotals) {
    throw new Error(`No User Totals for user ${email}`);
  }
  // Then Update userTotals
  const { update, initialUpdate } = utCalc(userTotals);

  // If user has already updated avatar, run update function, otherwise the initialUpdate which uses previous 10 activities.
  const ut = hasBeenUpgraded ? update(updatedActivities) : initialUpdate(updatedActivities, accountDate);
  // Finally, save to DB
  await UserTotal.update(ut, { where: { user: email }, transaction: t });
  return ut;
}

// RETRIEVE AVATAR AND ITEMS FROM DB
function _getAvatarAndItems(email, t) {
  return Promise.all([
    Avatar.findOne({
      where: { owner: email },
      attributes: ["id", "character", "createdAt", "activityXP", "battleXP", "power", "health", "maxHealth", "fire", "earth", "water", "air", "aether", "qpFire", "qpEarth", "qpWater", "qpAir", "qpPower", "qpHealth", "qpAether", "qp", "photonTokens", "status"],
      raw: true,
      transaction: t,
    }),
    Items.findAll({
      where: { dropRate: { [Op.ne]: null }, disabled: false },
      attributes: ["name", "dropRate", "levelRestriction", "activityRestriction", "disabled"],
      raw: true,
      transaction: t,
    }),
  ]);
}

// CALCULATE HOW MUCH THE HERO HAS IMPROVED IN THE DIFFERENT STATS
function _calcAvatarImprovements(avStatSnapshot, { power, maxHealth, health, air, water, fire, earth, aether }) {
  // minZero necessary because of rounding of the snapshot vs not rounding actual improvements. Sometimes, the actual improvements would be less than the snapshot
  // and cause an apparent negative improvement. It might be a good idea to look at the snapshot in the future and decide if I really should be rounding it.
  // in the mean time, this effective solves the itemFind error where items would sometimes have a negative chance to find.
  function minZero(val) {
    return val < 0 ? 0 : val;
  }

  return {
    power: minZero(power - avStatSnapshot.power),
    "max health": minZero(maxHealth - avStatSnapshot.maxHealth),
    health: minZero(health - avStatSnapshot.health),
    air: minZero(Number((air - avStatSnapshot.air).toFixed(2))),
    water: minZero(Number((water - avStatSnapshot.water).toFixed(2))),
    fire: minZero(Number((fire - avStatSnapshot.fire).toFixed(2))),
    earth: minZero(Number((earth - avStatSnapshot.earth).toFixed(2))),
    aether: minZero(Number((aether - avStatSnapshot.aether).toFixed(2))),
  };
}

// DETERMINE HOW HEAVILY USER WORKED OUT IN DIFFERENT ELEMENTS, USED FOR ITEM FIND LATER
function _calcWeightedElms({ air, water, fire, earth }) {
  // Needed for activity-specific items
  const totalElmImprove = air + water + fire + earth;
  return {
    air: (air / totalElmImprove) * 100,
    water: (water / totalElmImprove) * 100,
    fire: (fire / totalElmImprove) * 100,
    earth: (earth / totalElmImprove) * 100,
  };
}

// CALCULATE XP & LEVELS BASED ON USER ACTIVITIES
function _calcProgress(avatar, ut) {
  const avStatSnapshot = parseAvatarProperties(
    Object.assign(
      {},
      {
        activityXP: avatar.activityXP,
        power: avatar.power,
        maxHealth: avatar.maxHealth,
        fire: avatar.fire,
        earth: avatar.earth,
        water: avatar.water,
        air: avatar.air,
        aether: avatar.aether,
        health: avatar.health,
      },
    ),
  );
  const { checkLevelUp, calcNewActivityXPFromUt } = xpCalc(avatar.activityXP, avatar.battleXP);

  const { updatePower, updateHealth, updateAether, updateElements, updateStatus } = avCalc(ut);

  // Updated aXP
  const updatedAXP = calcNewActivityXPFromUt(ut);
  const aXPDiff = updatedAXP - avStatSnapshot.activityXP;

  const { leveledUp, startingLevel, endingLevel, qpEarned } = checkLevelUp(aXPDiff);
  const lvlUp = leveledUp;
  // endingLevel starts over after MAX_LEVEL(100)
  const lvlAfterBuff = endingLevel > MAX_LEVEL ? endingLevel - MAX_LEVEL : endingLevel;
  const levelInfo = {
    startingLevel,
    endingLevel,
    lvlUp,
    lvlAfterBuff,
    qpEarned,
    aXPDiff,
  };

  const updatedQP = qpEarned + avatar.qp;
  const updatedPower = updatePower(endingLevel, avatar.qpPower);
  const updatedAether = updateAether(endingLevel, avatar.qpAether);
  let { updatedHealth, updatedMaxHealth } = updateHealth(endingLevel, avatar.qpHealth, avatar.health, avatar.maxHealth, avatar.status, lvlUp);
  const updatedStatus = updateStatus(avatar.status, lvlUp);
  const { fire, earth, water, air } = updateElements(
    avatar.character,
    {
      qpFire: avatar.qpFire,
      qpEarth: avatar.qpEarth,
      qpWater: avatar.qpWater,
      qpAir: avatar.qpAir,
    },
    avatar.createdAt,
  );
  // For users with Aether, heal a portion of health based on activity time and aether
  updatedHealth = activityHeal(updatedHealth, updatedMaxHealth, avatar.aether, aXPDiff);

  return {
    avStatSnapshot,
    levelInfo,
    updatedAvatar: Object.assign({}, avatar, {
      power: updatedPower,
      aether: updatedAether,
      health: updatedHealth,
      maxHealth: updatedMaxHealth,
      status: updatedStatus,
      fire,
      earth,
      water,
      air,
      activityXP: updatedAXP,
      qp: updatedQP,
      hasBeenUpgraded: true,
    }),
  };
}

// RUN FUNCTION TO CHECK FOR FOUND ITEMS
function _handleActivityItemFind(weightedElms, improvements, levelInfo, updatedAvatar, possibleItemDrops) {
  const { aXPDiff, endingLevel } = levelInfo;
  console.log(aXPDiff);
  // the last param is an array of possible items drops
  // the second to Last two params are itemFind and ptFind stats (percentages that boost base of each)
  // Items & PT found during activity
  const { items, pt } = activityItemFind(aXPDiff, endingLevel, weightedElms, null, null, possibleItemDrops);

  return {
    foundItems: items,
    improvements: Object.assign(improvements, { "Photon Tokens": pt }),
    updatedAvatar: Object.assign(updatedAvatar, {
      photonTokens: updatedAvatar.photonTokens + improvements["Photon Tokens"],
    }),
  };
}

// UPDATE HERO IN DB
function _updateAvatar(email, updatedAvatar, t) {
  return Avatar.update({ ...updatedAvatar }, { where: { owner: email }, transaction: t });
}

// APPEND ALL EXTRA INFO NEEDED FOR HERO ON FRONTEND
function _appendLevelInfo(updatedAvatar) {
  const { activityXP, battleXP, recovery, health, maxHealth } = updatedAvatar;
  const { getCurrentLevel, getNextLevel, determineRecoveryPerHour } = xpCalc(activityXP, battleXP);
  const { level, albedo } = getCurrentLevel();

  return Object.assign({}, updatedAvatar, {
    level,
    albedo,
    nextLevelStartXp: getNextLevel(),
    thisLevelStartXp: getNextLevel(-1),
    healthRegenRate: determineRecoveryPerHour(recovery),
    restedEnough: maxHealth * 0.8 <= health,
  });
}

// RUN FUNCTIONS FOR ITEM FIND & REWARDS
function _handleAllItemAwarding(avatarID, improvements, avStatSnapshot, levelInfo, foundItems, t) {
  const { startingLevel, endingLevel } = levelInfo;
  const statObjForUpgrade = determineStatImprovements(improvements, avStatSnapshot);
  const allItemPromises = [
    // ITEMS FROM ITEM FIND
    insertItemsFromItemFind(avatarID, foundItems, t),
    // ITEMS FROM STAT REWARDS
    activityStatRewards(avatarID, statObjForUpgrade, t),
  ];

  // ITEMS FROM LEVELING
  if (endingLevel > startingLevel) {
    const levelsToCheck = range(startingLevel, endingLevel);
    allItemPromises.push(activityLevelRewards(avatarID, levelsToCheck, t));
  }

  return Promise.allSettled(allItemPromises);
}

// ROOT FUNCTION FOR UPGRADING HERO
function upgradeProcess(email, activities, accountDate, hasBeenUpgraded) {
  return db.transaction(async t => {
    try {
      // Before inserting activities, do separate db check to remove duplicates
      // This is needed since Sequelize's 'ignoreDuplicates' sucks and doesn't behave as expected

      const activityPromiseResults = await _insertActivityData(email, activities, t);
      const promiseStatuses = [activityPromiseResults[0].status, activityPromiseResults[1].status, activityPromiseResults[2].status];
      //console.log('PS=', activityPromiseResults[1]);

      if (promiseStatuses.includes("rejected")) {
        sendCronErrorEmail({
          status: 888,
          message: `USER = ${email} failed an upgrade`,
          debug: [],
          meta: JSON.stringify(activityPromiseResults[1]),
          version: "888",
          errorLocation: "backend - upgradeProcess",
        });
        throw new Error("Activity Insertion Failed");
      }

      const updatedActivities = activityPromiseResults[1].value.map(actResult => {
        return {
          type: actResult.type,
          duration: actResult.duration,
        };
      });
      let userTotals = activityPromiseResults[2].value;

      userTotals = await _handleUserTotalsUpdate(email, hasBeenUpgraded, updatedActivities, accountDate, userTotals, t);
      const [avatar, possibleItemDrops] = await _getAvatarAndItems(email, t);

      // Determine all progress made with XP, levels, etc.
      let { avStatSnapshot, levelInfo, updatedAvatar } = _calcProgress(avatar, userTotals);
      // Shouldn't happen but throw error if negative xp from activity
      if (levelInfo.aXPDiff < 0) {
        throw new Error("Negative XP");
      }

      // Calc gains here to be used in weighted element item find calculations & to be displayed on frontend
      let improvements = _calcAvatarImprovements(avStatSnapshot, updatedAvatar);

      // determine weight for each element in upgrade, which is used for itemFind likelihood in the proceeding step
      const weightedElms = _calcWeightedElms(improvements);

      let foundItems;
      // Run activity find module to see if any items were found from latest upgrade
      ({ foundItems, improvements, updatedAvatar } = _handleActivityItemFind(weightedElms, improvements, levelInfo, updatedAvatar, possibleItemDrops));

      // Save new Av to DB
      await _updateAvatar(email, updatedAvatar, t);

      // assign adjusted level-related properties to avatar
      updatedAvatar = _appendLevelInfo(updatedAvatar);

      // Returns all promise results from itemFind, activityStatRewards, activityLevelRewards
      // Destructures into itemsFromItemFind, rewards, and a possible levelReward (will be undefined unless a user earned a level up)
      const [{ value: itemsFromItemFind }, { value: rewards }, levelRewards] = await _handleAllItemAwarding(avatar.id, improvements, avStatSnapshot, levelInfo, foundItems, t);

      if (levelRewards) {
        rewards.push(...levelRewards.value);
      }
      console.log("IMPROVEMENTS-", improvements);
      // Return package to be used on the frontend
      return {
        activities,
        avatar: parseAvatarProperties(updatedAvatar, true),
        improvements: parseAvatarProperties(improvements, true),
        reachedLevel: levelInfo.lvlUp ? levelInfo.lvlAfterBuff : null,
        qpEarned: levelInfo.qpEarned,
        xpGain: levelInfo.aXPDiff,
        items: itemsFromItemFind,
        rewards,
      };
    } catch (error) {
      console.log("ERROR UPGRADING HERO", error);
      throw error;
    }
  });
}

module.exports = upgradeProcess;
