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
import { HeroSnapshot, BackendUserTotals, UserTotals, BackendActivity, ActivityRecordSource, UpgradeLevelInfo, UpgradeImprovements, UpgradeItem, UpgradeWeightedElements, HeroWithTransmutations, TransmutationType, BaseElements } from "../../types/BackendOnlyTypes";
import { determineTransmutation } from "./activityEffects";


// If id Is passed in, use it, but if it's a herofit source, then we need to create a new id for the activity
function _determineActivityId(id : number, source : ActivityRecordSource) {
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

// UPDATE USER, USER_ACTIVITIES, & GET USER_TOTALS BEFORE ANYTHING ELSE
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
async function _handleUserTotalsUpdate(email : string, hasBeenUpgraded : boolean, updatedActivities : BackendActivity[], accountDate : string, userTotals : UserTotals, t : Transaction) : Promise<UserTotals> {
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
function _getAvatarAndItems(email : string, t : Transaction) {

  const q = `
  SELECT avatars.*, equipped 
  FROM avatars
  LEFT OUTER JOIN (SELECT "avatarID", array_agg(json_build_object('equipped', equipped, 'itemID', "itemID")) AS equipped
    FROM avatar_items WHERE avatar_items.equipped=true group by 1) AS equipped ON(id="avatarID")
  WHERE avatars.owner = $1
`;
  return Promise.all([
    db.query(q, { bind: [email], transaction : t}),
    Items.findAll({
      where: { dropRate: { [Op.ne]: null }, disabled: false },
      attributes: ["name", "dropRate", "levelRestriction", "activityRestriction", "disabled"],
      raw: true,
      transaction: t,
    }),
  ]);
}

// CALCULATE HOW MUCH THE HERO HAS IMPROVED IN THE DIFFERENT STATS
function _calcAvatarImprovements(avStatSnapshot : HeroSnapshot, avatar : Partial<HF.Hero>) : UpgradeImprovements {
  const { power, maxHealth, health, air, water, fire, earth, aether } = avatar;
  const { fireToWater,fireToEarth,fireToAir,waterToAir,waterToEarth,waterToFire,airToEarth,airToFire,airToWater,earthToWater,earthToAir,earthToFire} = avStatSnapshot;
  function minZero(val : number) {
    if(val < 0){
      //sendBackendOnlyEmail("There was a Hero Upgrade where a negative value was present.", JSON.stringify(avatar));
      return 0;
    }
    return val;
  }
  
  // Since the avatar value coming in was just adjusted from new user totals, we need to account for previous transmutations here
  return {
    power: minZero(power - avStatSnapshot.power),
    "max health": minZero(maxHealth - avStatSnapshot.maxHealth),
    health: minZero(health - avStatSnapshot.health),
    air: minZero(Number(((air + fireToAir + waterToAir + earthToAir) - (avStatSnapshot.air + airToWater + airToFire + airToEarth)))),
    water: minZero(Number(((water + fireToWater + airToWater + earthToWater) - (avStatSnapshot.water + waterToEarth + waterToFire + waterToAir)))),
    fire: minZero(Number(((fire + earthToFire + airToFire + waterToFire) - (avStatSnapshot.fire + fireToWater + fireToEarth + fireToAir)))),
    earth: minZero(Number(((earth + fireToEarth + waterToEarth + airToEarth) - (avStatSnapshot.earth + earthToWater + earthToFire + earthToAir)))),
    aether: minZero(Number((aether - avStatSnapshot.aether))),

  };
}

// DETERMINE HOW HEAVILY USER WORKED OUT IN DIFFERENT ELEMENTS, USED FOR ITEM FIND LATER
function _calcWeightedElms({ air, water, fire, earth } : UpgradeImprovements) : UpgradeWeightedElements {
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
function _calcProgress(avatar: HeroWithTransmutations, ut: BackendUserTotals) {

  const avStatSnapshot = 
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
        'fireToWater':avatar.fireToWater,
        'fireToEarth':avatar.fireToEarth,
        'fireToAir':avatar.fireToAir,
        'waterToAir':avatar.waterToAir,
        'waterToEarth':avatar.waterToEarth,
        'waterToFire':avatar.waterToFire,
        'airToEarth':avatar.airToEarth,
        'airToFire':avatar.airToFire,
        'airToWater':avatar.airToWater,
        'earthToWater':avatar.earthToWater,
        'earthToAir':avatar.earthToAir,
        'earthToFire':avatar.earthToFire
      }
    )as HeroSnapshot;

  const { checkLevelUp, calcNewActivityXPFromUt } = xpCalc(avatar.activityXP, avatar.battleXP);

  const { updatePower, updateHealth, updateAether, updateElements, updateStatus, transmuteElements } = avCalc(ut);
    
  
      
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
  const {fire,earth,air,water} = updateElements(
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
    transmuteElements
  };
}

// RUN FUNCTION TO CHECK FOR FOUND ITEMS
function _handleActivityItemFind(weightedElms : UpgradeWeightedElements, improvements : UpgradeImprovements, levelInfo : UpgradeLevelInfo, updatedAvatar: HeroWithTransmutations, possibleItemDrops) {
  const { aXPDiff, endingLevel } = levelInfo;

  // Bonuses for Hero Passives
  const itemFindStatBoost = updatedAvatar.character === "RePete" ? THRIFTY_SALVAGE_PERCENT : null;
  const ptFindStatBoost = updatedAvatar.character === "Wilhelm the Wild" ? WILDLY_RESOURCEFUL_PT_PERCENT : null;

  // ITEMS & PT FOUND DURING ACTIVITIES
  // the last param is an array of possible items drops
  // the second to Last two params are itemFind and ptFind stats (percentages that boost base of each)
  const { items, pt } : {items : string[], pt : number} = activityItemFind(aXPDiff, endingLevel, weightedElms, itemFindStatBoost, ptFindStatBoost, possibleItemDrops);

  return {
    foundItems: items,
    improvementsAfterPt: Object.assign(improvements, { "Photon Tokens": pt }),
    avatarAfterPt: Object.assign(updatedAvatar, {
      photonTokens: updatedAvatar.photonTokens + improvements["Photon Tokens"],
    }),
  };
}

// UPDATE HERO IN DB
function _updateAvatar(email : string, updatedAvatar : HeroWithTransmutations, t : Transaction) {
  return Avatar.update({ ...updatedAvatar }, { where: { owner: email }, transaction: t });
}

// APPEND ALL EXTRA INFO NEEDED FOR HERO ON FRONTEND
function _appendLevelInfo(updatedAvatar : HF.Hero) {
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
function _handleAllItemAwarding(avatarID : number, improvements : UpgradeImprovements, avStatSnapshot : HeroSnapshot, levelInfo : UpgradeLevelInfo, foundItems : string[], t : Transaction) {
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

      

      let [results, possibleItemDrops] : [any, UpgradeItem[]] = await _getAvatarAndItems(email, t);
      const parsedAvatar = parseStats(results[0][0]);
      const equippedItems = await Items.findAll({
        where: { id: { [Op.in]: parsedAvatar.equipped.map(i => i.itemID) }},
        attributes: ["name", "effects"],
        raw: true,
        transaction: t,
      });

      /* TODO: In the future, need to account for more than one activity effect  */

      const activityEffect = equippedItems.map(item => item.effects).flat().find(e => e !== null && e.type === 'activity');


      const transmuteTo = determineTransmutation(activityEffect);
      
      
      possibleItemDrops = possibleItemDrops.map(i => ({
        name: i.name,
        dropRate: +i.dropRate,
        levelRestriction: i.levelRestriction,
        activityRestriction: i.activityRestriction,
        disabled: i.disabled,
      }));
      //console.log('PSA', possibleItemDrops);
      // Determine all progress made with XP, levels, etc.
      let { avStatSnapshot, levelInfo, updatedAvatar, transmuteElements } = _calcProgress(parsedAvatar, userTotals);
      // Shouldn't happen but throw error if negative xp from activity
      if (levelInfo.aXPDiff < 0) {
        throw new Error("Negative XP");
      }
      // Calc gains here to be used in weighted element item find calculations & to be displayed on frontend
      const improvements = _calcAvatarImprovements(avStatSnapshot, updatedAvatar);

      const { transmutedImprovements, heroAfterTransmutation : avatarAfterTransmutation } = transmuteElements(improvements, updatedAvatar, transmuteTo);


      // determine weight for each element in upgrade, which is used for itemFind likelihood in the proceeding step
      const weightedElms = _calcWeightedElms(transmutedImprovements);

      // Run activity find module to see if any items were found from latest upgrade
      const { foundItems, improvementsAfterPt, avatarAfterPt } = _handleActivityItemFind(weightedElms, transmutedImprovements, levelInfo, avatarAfterTransmutation, possibleItemDrops);

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
