const { User, UserActivity, UserTotal, Avatar, Items } = require('../../config/db');
const db = require('../../config/db').db;
const { Op } = require("sequelize");
const moment = require('moment');
const { parseAvatarProperties, range } = require('../../lib/helperFunctions');
const { COMPETITIVE_ACTIVITIES, NONCOMPETITIVE_ACTIVITIES, MAX_LEVEL } = require('../CONSTANTS');
const utCalc = require('../upgrades/utCalc');
const avCalc = require('../upgrades/avCalc');
const xpCalc = require('../upgrades/xpCalc');
const { activityItemFind, insertItemsFromItemFind } = require('./activityItemFind');
const { activityStatRewards, activityLevelRewards, determineStatImprovements } = require('./activityRewards');
const activityHeal = require('./activityHeal');

let avatar;
let possibleItemDrops;
let ut, avStatSnapshot, aXPDiff, lvlUp, lvlAfterBuff, qpe;
let startingUpgradeLevel, endingUpgradeLevel;
let improvements, foundItems;
let updatedAvatar, updatedActivities;

// UPDATE USER, USERACTIVIES, & GET USERTOTALS BEFORE ANYTHING ELSE
function _insertActivityData(email, activities, t){
    // Need latest Activity to be added to user's account
    let latestActivityUpdate;
    const activityEntries = activities.map((activity) =>{
      const activityDate = moment.utc(activity.start_date);
      const activityId = activity.id;
      
      // Check for latest activity (doesn't include DB activities)
      if(!latestActivityUpdate || activityDate.isAfter(moment.utc(latestActivityUpdate))){
        latestActivityUpdate = moment.utc(activity.start_date).format('YYYY-MM-DD HH:mm:ss');
      }
      return { user : email,  activity, activityDate : latestActivityUpdate, activityId };
    });

    const allPromises = [
      // Update latestActivity Date on USER
      User.update({ latestActivityUpdate },{ where: { email }, transaction: t }),
      // Insert All activities
      UserActivity.bulkCreate(activityEntries, { ignoreDuplicates: true, returning : true, transaction: t }),
      // Find matching User Totals
      UserTotal.findOne({ attributes : [...COMPETITIVE_ACTIVITIES, ...NONCOMPETITIVE_ACTIVITIES], where: { user: email }, raw : true, transaction: t })
    ];

   return Promise.allSettled(allPromises)
}

// UPDATE USER TOTALS
function _handleUserTotalsUpdate(email, hasBeenUpgraded, updatedActivities, accountDate, userTotals, t){
  if(!userTotals){
    throw new Error(`No User Totals for user ${email}`);
  }
  // Then Update userTotals
  const { update, initialUpdate } = utCalc(userTotals);

  // If user has already updated avatar, run update function, otherwise the initialUpdate which uses previous 10 activities.
  ut = hasBeenUpgraded ? update(updatedActivities) : initialUpdate(updatedActivities, accountDate);
  // Finally, save to DB
  return UserTotal.update(ut, { where: { user: email }, transaction : t });
}

// RETRIEVE AVATAR AND ITEMS FROM DB
function _getAvatarAndItems(email, t){
  return Promise.all([
    Avatar.findOne({ 
      where: { owner: email }, attributes : ['id','character', 'createdAt','activityXP', 'battleXP', 'power', 'health', 'maxHealth', 'fire', 'earth', 'water', 'air', 'aether', 'qpFire', 'qpEarth', 'qpWater', 'qpAir', 'qpPower', 'qpHealth', 'qpAether', 'qp', 'photonTokens', 'status'], raw : true, transaction: t, 
    }), 
    Items.findAll({ 
      where: { dropRate: { [Op.ne]: null }, disabled : false }, attributes : ['name', 'dropRate', 'levelRestriction', 'activityRestriction', 'disabled'], raw : true, transaction: t, 
  })])
}

// CALCULATE HOW MUCH THE HERO HAS IMPROVED IN THE DIFFERENT STATS
function _calcAvatarImprovements(){
  const { power, maxHealth, health, air, water, fire, earth, aether } = updatedAvatar;
  return improvements = {
    power : power - avStatSnapshot.power,
    "max health" : maxHealth - avStatSnapshot.maxHealth,
    health : health - avStatSnapshot.health,
    air : Number((air - avStatSnapshot.air).toFixed(2)),
    water : Number((water - avStatSnapshot.water).toFixed(2)),
    fire : Number((fire - avStatSnapshot.fire).toFixed(2)),
    earth : Number((earth - avStatSnapshot.earth).toFixed(2)),
    aether : Number((aether - avStatSnapshot.aether).toFixed(2)),
  };
}

// DETERMINE HOW HEAVILY USER WORKED OUT IN DIFFERENT ELEMENTS, USED FOR ITEM FIND LATER
function _calcWeightedElms(){
    // Needed for activity-specific items
    const totalElmImprove = improvements.air + improvements.water + improvements.fire + improvements.earth;
    return {
      air : (improvements.air / totalElmImprove) * 100,
      water : (improvements.water / totalElmImprove) * 100,
      fire : (improvements.fire / totalElmImprove) * 100,
      earth : (improvements.earth / totalElmImprove) * 100,
    } 
}

// CALCULATE XP & LEVELS BASED ON USER ACTIVITIES
function _calcProgress(){
  const snapshot = Object.assign({}, { activityXP : avatar.activityXP, power : avatar.power, maxHealth : avatar.maxHealth, fire : avatar.fire, earth : avatar.earth, water : avatar.water, air : avatar.air, aether : avatar.aether, health : avatar.health });
  avStatSnapshot = parseAvatarProperties(snapshot);
  const { checkLevelUp, calcNewActivityXPFromUt } = xpCalc(avatar.activityXP, avatar.battleXP);

  const { updatePower, updateHealth, updateAether, updateElements, updateStatus } = avCalc(ut);  

  // Updated aXP
  const updatedAXP = calcNewActivityXPFromUt(ut);
  aXPDiff = (updatedAXP - avStatSnapshot.activityXP);

  const { leveledUp, startingLevel, endingLevel, qpEarned } = checkLevelUp(aXPDiff);
  startingUpgradeLevel = startingLevel;
  endingUpgradeLevel = endingLevel;
  lvlUp = leveledUp;
  // endingLevel starts over after MAX_LEVEL(100)
  lvlAfterBuff = endingLevel > MAX_LEVEL ? (endingLevel - MAX_LEVEL) : endingLevel;
  qpe = qpEarned;
  const updatedQP = qpe + avatar.qp;

  const updatedPower = updatePower(endingLevel, avatar.qpPower);
  const updatedAether = updateAether(endingLevel, avatar.qpAether);
  let { updatedHealth, updatedMaxHealth } = updateHealth(endingLevel, avatar.qpHealth, avatar.health, avatar.maxHealth, avatar.status, lvlUp);
  const updatedStatus = updateStatus(avatar.status, lvlUp);
  const { fire, earth, water, air } = updateElements(avatar.character, { qpFire : avatar.qpFire, qpEarth : avatar.qpEarth, qpWater : avatar.qpWater, qpAir : avatar.qpAir }, avatar.createdAt);
  // For users with Aether, heal a portion of health based on activity time and aether
  updatedHealth = activityHeal(updatedHealth, updatedMaxHealth, avatar.aether, aXPDiff);

  updatedAvatar = Object.assign({}, avatar, {
    power : updatedPower,
    aether : updatedAether,
    health : updatedHealth,
    maxHealth : updatedMaxHealth,
    status : updatedStatus,
    fire, earth, water, air,
    activityXP : updatedAXP,
    qp : updatedQP,
    hasBeenUpgraded : true
  });

}

// RUN FUNCTION TO CHECK FOR FOUND ITEMS
function _handleActivityItemFind(weightedElms){
  // the last param is an array of possible items drops
  // the second to Last two params are itemFind and ptFind stats (percentages that boost base of each)
  const { items, pt } = activityItemFind(aXPDiff, endingUpgradeLevel, weightedElms, null, null, possibleItemDrops);
  // Items & PT found during activity
  foundItems = items;
  improvements["Photon Tokens"] = pt;
  updatedAvatar.photonTokens += improvements["Photon Tokens"];
}

// UPDATE HERO IN DB
function _updateAvatar(email, t){
  return Avatar.update({...updatedAvatar},
    { where: { owner: email }, transaction: t }
  );
}

// APPEND ALL EXTRA INFO NEEDED FOR HERO ON FRONTEND
function _appendLevelInfo(){
  const { getCurrentLevel, getNextLevel, determineRecoveryPerHour } = xpCalc(updatedAvatar.activityXP, updatedAvatar.battleXP);
  const { level, albedo } = getCurrentLevel();

  updatedAvatar.level = level;
  updatedAvatar.albedo = albedo;
  updatedAvatar.nextLevelStartXp = getNextLevel();
  updatedAvatar.thisLevelStartXp = getNextLevel(-1);
  updatedAvatar.healthRegenRate = determineRecoveryPerHour(updatedAvatar.recovery);
  updatedAvatar.restedEnough = updatedAvatar.maxHealth * .8 <= updatedAvatar.health;
  
}

// RUN FUNCTIONS FOR ITEM FIND & REWARDS
function _handleAllItemAwarding(t){
  
  const statObjForUpgrade = determineStatImprovements(improvements, avStatSnapshot)
  const allItemPromises = [
    // ITEMS FROM ITEM FIND
    insertItemsFromItemFind(avatar.id, foundItems, t),
    // ITEMS FROM STAT REWARDS
    activityStatRewards(avatar.id, statObjForUpgrade, t)
  ];

  // ITEMS FROM LEVELING
  if(endingUpgradeLevel > startingUpgradeLevel){
    const levelsToCheck = range(startingUpgradeLevel, endingUpgradeLevel);
    allItemPromises.push(activityLevelRewards(avatar.id, levelsToCheck, t));
  }
  
  return Promise.allSettled(allItemPromises);
}

// ROOT FUNCTION FOR UPGRADING HERO
function upgradeProcess(email, activities, accountDate, hasBeenUpgraded){
  return db.transaction(async t => {
    try{
      const activityPromiseResults = await _insertActivityData(email, activities, t)
      updatedActivities = activityPromiseResults[1].value.map(actResult => actResult.dataValues.activity);
      const userTotals = activityPromiseResults[2].value;

      await _handleUserTotalsUpdate(email, hasBeenUpgraded, updatedActivities, accountDate, userTotals, t);
      [ avatar, possibleItemDrops ] = await _getAvatarAndItems(email, t);

      // Determine all progress made with XP, levels, etc.
      _calcProgress();

      // Calc gains here to be used in weighted element item find calculations & to be displayed on frontend
      _calcAvatarImprovements();

      // determine weight for each element in upgrade, which is used for itemFind likelihood in the proceeding step
      const weightedElms = _calcWeightedElms();

      // Run activity find module to see if any items were found from latest upgrade
      _handleActivityItemFind(weightedElms);

      // Save new Av to DB
      await _updateAvatar(email, t);

      // assign adjusted level-related properties to avatar
      _appendLevelInfo();

      // Returns all promise results from itemFind, activityStatRewards, activityLevelRewards 
      // Destructures into itemsFromItemFind, rewards, and a possible levelReward (will be undefined unless a user earned a level up)
      [{value : itemsFromItemFind}, {value : rewards}, levelRewards] = await _handleAllItemAwarding(t);

      if(levelRewards){
        rewards.push(...levelRewards.value);
      }

      // Return package to be used on the frontend
      return {
        activities,
        avatar : updatedAvatar,
        improvements : parseAvatarProperties(improvements, true),
        reachedLevel : lvlUp ? lvlAfterBuff : null,
        qpEarned : qpe,
        xpGain : aXPDiff,
        items : itemsFromItemFind,
        rewards
      }
    }catch(error){
      console.log('ERROR UPGRADING HERO', error);
      throw error;
    }
  });
}

module.exports = upgradeProcess;