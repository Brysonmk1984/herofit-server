//const { Avatar, AvatarItems, User, UserTotal, Items } = require('../../config/db');
const { Op } = require("sequelize");
const { Items, AvatarItems } = require('../../config/db');
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
      
      console.log('AWARDS TO DISPLAY:', rewards);
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
  const levelRewardNames = [];
  for(let stat in statObj){
    const matchingStatInUpgradeActions = upgradeActions.filter(action => action.stat === stat);
    const matchingToValue = matchingStatInUpgradeActions.filter(action => action.requiredAmount === statObj[stat]);
    const rewardNames = matchingToValue.map(reward => reward.name);
    levelRewardNames.push(rewardNames);
  }
  console.log('LRN = ', levelRewardNames);
  
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
      
      console.log('AWARDS TO DISPLAY:', rewards);
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

module.exports = { activityLevelRewards, activityStatRewards};