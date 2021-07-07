const { UserTotal, Avatar, Items } = require('../../config/db');
const db = require('../../config/db').db;
const { Op } = require("sequelize");
const { parseAvatarProperties, range } = require('../../lib/helperFunctions');
const { COMPETITIVE_ACTIVITIES, NONCOMPETITIVE_ACTIVITIES, MAX_LEVEL } = require('../CONSTANTS');
const avCalc = require('../upgrades/avCalc');
const xpCalc = require('../upgrades/xpCalc');
const { activityItemFind, insertItemsFromItemFind } = require('./activityItemFind');
const { activityStatRewards, activityLevelRewards, determineStatImprovements } = require('./activityRewards');
const preventDuplicateItems = require('../items/preventDuplicateItems');
const activityHeal = require('./activityHeal');

let avatar;
let possibleItemDrops;
let ut, avStatSnapshot, aXPDiff, lvlUp, lvlAfterBuff, qpe;
let startingUpgradeLevel, endingUpgradeLevel;
let improvements, foundItems;
let updatedAvatar;

// RETRIEVE USERTOTALS AND AVATAR FROM DB
function _getExistingData(email, t){
  return Promise.all([
    UserTotal.findOne({
      where: { user: email }, attributes: [...COMPETITIVE_ACTIVITIES, ...NONCOMPETITIVE_ACTIVITIES], raw : true, transaction: t 
    }),
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
  const updatedQP = qpe += avatar.qp;

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
  //console.log('FOUND!', foundItems);
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
function upgradeProcess(email){
  return db.transaction(t => {
    return _getExistingData(email, t).then((result) =>{
      ut = result[0];
      avatar = result[1];
      possibleItemDrops = result[2];

      // Determine all progress made with XP, levels, etc.
      _calcProgress();

      // Calc gains here to be used in weighted element item find calculations & to be displayed on frontend
      _calcAvatarImprovements();

      // determine weight for each element in upgrade, which is used for itemFind likelihood in the proceeding step
      const weightedElms = _calcWeightedElms();

      // Run activity find module to see if any items were found from latest upgrade
      _handleActivityItemFind(weightedElms);

      // Save new Av to DB
      return _updateAvatar(email, t);

    }).then(() =>{
      // assign adjusted level-related properties to avatar
      _appendLevelInfo();
      return _handleAllItemAwarding(t);
    }).then((promiseResults) =>{  
      // RETURNS ALL promise results from itemFind, activityStatRewards, activityLevelRewards 
      const itemsFromItemFind = promiseResults[0].value;
      const rewards = [...promiseResults[1].value, ...promiseResults[2].value];
      
      //console.log(itemsFromItemFind, rewards);

      // Return package to be used on the frontend
      return {
        avatar : updatedAvatar,
        improvements : parseAvatarProperties(improvements, true),
        reachedLevel : lvlUp ? lvlAfterBuff : null,
        qpEarned : qpe,
        xpGain : aXPDiff,
        items : itemsFromItemFind,
        rewards : rewards
      }

    }).catch((error) =>{
      console.log('ERROR UPGRADING HERO', error);
    });
  });
}

module.exports = upgradeProcess;