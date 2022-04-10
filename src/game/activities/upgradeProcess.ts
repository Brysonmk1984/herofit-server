import { User, UserActivity, UserTotal, Avatar, Items, AvatarItems } from "../../config/db";
import { db } from "../../config/db";
import { Op, Transaction } from "sequelize";
import moment from "moment";
import crypto from "crypto";
import { parseStats, range } from "../../lib/helperFunctions";
import { COMPETITIVE_ACTIVITIES, NONCOMPETITIVE_ACTIVITIES, MAX_LEVEL, THRIFTY_SALVAGE_PERCENT, WILDLY_RESOURCEFUL_PT_PERCENT, WILDLY_RESOURCEFUL_HEAL_PERCENT, TRANSMUTATION_EFFECTS } from "../CONSTANTS";
import utCalc from "../upgrades/utCalc";
import avCalc from "../upgrades/avCalc";
import xpCalc from "../upgrades/xpCalc";
import { activityItemFind, insertItemsFromItemFind } from "./activityItemFind";
import { activityStatRewards, activityLevelRewards, determineStatImprovements } from "./activityRewards";
import { activityHeal } from "./activityHeal";
import { sendBackendOnlyEmail } from "../../mail";
import HF from "../../types/herofit";
import { BackendUserTotals } from "../../types/BackendOnlyTypes";

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
function _prepareActivitiesForDb(email: string, activities: HF.Activity[]): { activityEntries: HF.Activity[]; latestActivityUpdate: string } {
  // Need latest Activity to be added to user's account
  let latestActivityUpdate: string;
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

async function _dedupActivities(activities: HF.Activity[], t: Transaction) {
  const actIdArray = activities.map(act => act.activityId.toString());

  try {
    const duplicateActivities = await UserActivity.findAll({ attributes: ["activityId"], where: { activityId: { [Op.in]: actIdArray } }, transaction: t });
    const duplicateActivityIds = duplicateActivities.map(act => act.activityId);
    //console.log('THE activityIds of the duplicate activities', duplicateActivityIds);

    // duplicateActivityIds is an array of activities that are confirmed already in the DB
    // we want to exclude all 'activities' that match these ids.
    return activities.filter(act => {
      // Only return activities that are not in the duplicateActivityId array
      return !duplicateActivityIds.includes(act.activityId);
    });
  } catch (error) {
    console.log("ERROR-", error);
    throw error;
  }
}

// UPDATE USER, USERACTIVIES, & GET USERTOTALS BEFORE ANYTHING ELSE
async function _insertActivityData(email: string, activities: HF.Activity[], t: Transaction) {
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

  return Promise.all(allPromises);
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

interface Improvements {
  power : number
  "max health" : number
  health : number
  air : number
  water : number
  fire : number
  earth : number
  aether : number
}

// CALCULATE HOW MUCH THE HERO HAS IMPROVED IN THE DIFFERENT STATS
function _calcAvatarImprovements(avStatSnapshot, { power, maxHealth, health, air, water, fire, earth, aether }) : Improvements {
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

async function _determineElementTransmutations(improvements : Improvements, avatarID : number, t : Transaction){
  const rows = await AvatarItems.findAll({
    attributes: ["id", "avatarID", "itemID"],
    where: { avatarID, equipped : true },
    include: [
      {
        model: Items,
        as: "item",
        attributes: ["type", "name","effects"],
      },
    ],
    raw: undefined,
    nest: true,
    transaction: t,
  });

  interface AvatarItemItem {
    id : number
    avatarID : number
    itemID : number
    item : { [val : string] : Record<string, unknown> & { dataValues : Array<HF.Item> } }
  }

  const inventory = rows.map(({id, avatarID, itemID, item} : AvatarItemItem) => ({ id, avatarID, itemID, ...item.dataValues }))
  const itemEffectNamesArray = Object.values(inventory.map((item : HF.Item) => item.effects)).map(effect => effect.name);
  if(itemEffectNamesArray.includes(TRANSMUTATION_EFFECTS)){
    console.log('TODO - handle switching the improvements here!');
  }
  console.log({itemEffectsArray});

  return improvements;
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
function _calcProgress(avatar: HF.Hero, ut: BackendUserTotals) {
  const avStatSnapshot = parseStats(
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

  let aXPDiff = updatedAXP - avStatSnapshot.activityXP;

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

  // For users with Aether, heal a portion of health based on activity time and aether
  if (avatar.character === "Wilhelm the Wild") {
    updatedHealth = activityHeal(updatedHealth, updatedMaxHealth, WILDLY_RESOURCEFUL_HEAL_PERCENT, aXPDiff);
  }

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
function _handleActivityItemFind(weightedElms, improvements, levelInfo, updatedAvatar: HF.Hero, possibleItemDrops) {
  const { aXPDiff, endingLevel } = levelInfo;

  // Bonuses for Hero Passives
  const itemFindStatBoost = updatedAvatar.character === "RePete" ? THRIFTY_SALVAGE_PERCENT : null;
  const ptFindStatBoost = updatedAvatar.character === "Wilhelm the Wild" ? WILDLY_RESOURCEFUL_PT_PERCENT : null;

  // ITEMS & PT FOUND DURING ACTIVITIES
  // the last param is an array of possible items drops
  // the second to Last two params are itemFind and ptFind stats (percentages that boost base of each)
  const { items, pt } = activityItemFind(aXPDiff, endingLevel, weightedElms, itemFindStatBoost, ptFindStatBoost, possibleItemDrops);

  return {
    foundItems: items,
    improvementsAfterPt: Object.assign(improvements, { "Photon Tokens": pt }),
    avatarAfterPt: Object.assign(updatedAvatar, {
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
function upgradeProcess(email: string, activities: HF.Activity[], accountDate: string, hasBeenUpgraded: boolean) {
  return db.transaction(async t => {
    try {
      // Before inserting activities, do separate db check to remove duplicates
      // This is needed since Sequelize's 'ignoreDuplicates' sucks and doesn't behave as expected
      let [_, userActivities, userTotals] = await _insertActivityData(email, activities, t);

      userTotals = await _handleUserTotalsUpdate(email, hasBeenUpgraded, userActivities, accountDate, userTotals, t);

      /*
        COMING SOON:
        FOR ELEMENT TRANSMUTATION, NEED TO EITHER FETCH EQUIPPED PET OR PASS IT IN FROM THE FRONT END
      */
      
      

      let [avatar, possibleItemDrops] = await _getAvatarAndItems(email, t);
      possibleItemDrops = possibleItemDrops.map(i => ({
        name: i.name,
        dropRate: +i.dropRate,
        levelRestriction: i.levelRestriction,
        activityRestriction: i.activityRestriction,
        disabled: i.disabled,
      }));
      //console.log('PSA', possibleItemDrops);
      // Determine all progress made with XP, levels, etc.
      const { avStatSnapshot, levelInfo, updatedAvatar } = _calcProgress(avatar, userTotals);
      // Shouldn't happen but throw error if negative xp from activity
      if (levelInfo.aXPDiff < 0) {
        throw new Error("Negative XP");
      }

      // Calc gains here to be used in weighted element item find calculations & to be displayed on frontend
      const improvements = _calcAvatarImprovements(avStatSnapshot, updatedAvatar);

      /*
      // NEW - Check for equipped item that transmutes elements
      */

      let improvementsAfterTransmutation = await _determineElementTransmutations(improvements, updatedAvatar.id, t);


      // determine weight for each element in upgrade, which is used for itemFind likelihood in the proceeding step
      const weightedElms = _calcWeightedElms(improvementsAfterTransmutation);


      // Run activity find module to see if any items were found from latest upgrade
      const { foundItems, improvementsAfterPt, avatarAfterPt } = _handleActivityItemFind(weightedElms, improvementsAfterTransmutation, levelInfo, updatedAvatar, possibleItemDrops);

      // Save new Av to DB
      await _updateAvatar(email, avatarAfterPt, t);

      // assign adjusted level-related properties to avatar
      const avatarAfterLevelInfo = _appendLevelInfo(avatarAfterPt);

      // Returns all promise results from itemFind, activityStatRewards, activityLevelRewards
      // Destructures into itemsFromItemFind, rewards, and a possible levelReward (will be undefined unless a user earned a level up)
      const [{ value: itemsFromItemFind }, { value: rewards }, levelRewards] = await _handleAllItemAwarding(avatarAfterLevelInfo.id, improvementsAfterPt, avStatSnapshot, levelInfo, foundItems, t);

      if (levelRewards) {
        rewards.push(...levelRewards.value);
      }
      //console.log("IMPROVEMENTS-", improvements);
      // Return package to be used on the frontend
      return {
        activities,
        avatar: parseStats(avatarAfterLevelInfo, true),
        improvements: parseStats(improvementsAfterPt, true),
        reachedLevel: levelInfo.lvlUp ? levelInfo.lvlAfterBuff : null,
        qpEarned: levelInfo.qpEarned,
        xpGain: levelInfo.aXPDiff,
        items: itemsFromItemFind,
        rewards,
      };
    } catch (error) {
      console.log("ERROR UPGRADING HERO", error);
      sendBackendOnlyEmail(`USER = ${email} failed an upgrade`, error);
      throw error;
    }
  });
}

export default upgradeProcess;
