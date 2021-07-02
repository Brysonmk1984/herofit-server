//const { Avatar, AvatarItems, User, UserTotal, Items } = require('../../config/db');
const { Op } = require("sequelize");
const { Items, AvatarItems } = require('../../config/db');
const { range } = require('../../lib/helperFunctions');
const upgradeActions = require('./upgradeHeroActions.json');


function _insertLevelRewards(avatarID, levelsEarned, t){
  // Filter all possible rewards down to just the ones that match the type 'levelReward' AND are of one of the levels passed in the levelsEarned array 
  const levelRewards = upgradeActions.filter(action => action.type === 'levelReward').filter((action) => levelsEarned.find(lvl => lvl === action.requiredLevel));
  const levelRewardNames = levelRewards.map(reward => reward.name);

  return Items.findAll({
    attributes : { id : avatarID },
    where : { name : {[Op.in] : levelRewardNames} },
    raw : true
  }).then((items) => {
    const avItems = items.map(item => {
      return { avatarID, itemID : item.id }
    });

    return AvatarItems.bulkCreate(avItems, { transaction: t })
    .then(() =>{
      // Used for displaying rewards to user after level up only
      const rewards = [];
      items.forEach((item) =>{
        rewards.push({
          type : item.type,
          name : item.name,
          description : item.description
        });
      });
      
      //console.log('AWARDS TO DISPLAY:', rewards);
      return rewards.length ? rewards : null;
    }).catch((error) => {
      console.log('ERROR WITH CREATING AVATARITEMS', error);
      throw error;
    });
  }).catch((error) =>{
    console.log('ERROR FINDING ITEMS', error);
    throw error;
  });


}

function _insertStatRewards(avatarID, statObj, t){
  const statRewardNames = [];
  for(let stat in statObj){
    // For each stat, find the matching Upgrade Actions for each point the hero achieved
    const matchingActions = statObj[stat].map(statPoint => {
      return upgradeActions.filter(action => action.stat === stat).find(action => action.requiredAmount === statPoint);
    }).filter(Boolean);
    const rewardNames = matchingActions.map(reward => reward.name);
    statRewardNames.push(...rewardNames);
  }

  

  return Items.findAll({
    attributes : { id : avatarID },
    where : { name : {[Op.in] : statRewardNames} },
    raw : true
  }).then((items) => {
    const avItems = items.map(item => {
      return { avatarID, itemID : item.id }
    });

    return AvatarItems.bulkCreate(avItems, { transaction: t })
    .then(() =>{
      // Used for displaying rewards to user after level up only
      const rewards = [];
      items.forEach((item) =>{
        rewards.push({
          type : item.type,
          name : item.name,
          description : item.description
        });
      });

      return rewards.length ? rewards : null;
    }).catch((error) => {
      console.log('ERROR WITH CREATING AVATARITEMS', error);
      throw error;
    });
  }).catch((error) =>{
    console.log('ERROR FINDING ITEMS', error);
    throw error;
  });


}

function determineStatImprovements(improvements, snapshot){
  const statObj = { fire : [], earth : [], water : [], air : [] };
  const statsToCheck = ['fire', 'earth', 'water', 'air'];

  for(stat in improvements){
    if(statsToCheck.includes(stat) && improvements[stat] > 0){
      statObj[stat] = range(Math.floor(snapshot[stat] + 1), Math.floor(snapshot[stat] + improvements[stat]));
    }
  }

  return statObj;
}

function activityLevelRewards(avatarID, levelsEarned, t){
  return _insertLevelRewards(avatarID, levelsEarned, t)
  .then((data) =>{
    return data;
  }).catch((error) =>{
    console.log('Error in main activityRewards function', error);
    throw error;
  });
};

function activityStatRewards(avatarID, statObj, t){
  return _insertStatRewards(avatarID, statObj, t)
  .then((data) =>{
    return data;
  }).catch((error) =>{
    console.log('Error in main activityRewards function', error);
    throw error;
  });
};

module.exports = { activityLevelRewards, activityStatRewards, determineStatImprovements };