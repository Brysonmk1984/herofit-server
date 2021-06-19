const { col } = require("sequelize");
const { Avatar, UserTotal, Items } = require('../config/db');
const xpCalc = require('./upgrades/xpCalc');
const avCalc = require('./upgrades/avCalc');
const { COMPETITIVE_ACTIVITIES, NONCOMPETITIVE_ACTIVITIES, BASE_RECOVERY } = require('./CONSTANTS');
const instantiateBattle = require('./instantiateBattle');

// Retrocausal Capsule
function resetHero(avatarID, email){
  let userTotals;
  
  // GET USER TOTALS
  return UserTotal.findOne(
    { where: { user: email }, attributes: [...COMPETITIVE_ACTIVITIES, ...NONCOMPETITIVE_ACTIVITIES], raw : true }
  ).then((ut) =>{
    userTotals = ut;
    // GET AVATAR
    return Avatar.findOne({
      attributes : ['health','activityXP', 'battleXP', 'character', 'createdAt', 'owner'],
      where : { id : avatarID }
    });
  }).then(({ health, activityXP, battleXP, character, createdAt }) =>{
    const { getCurrentLevel } = xpCalc(activityXP, battleXP);
    const heroLevel = getCurrentLevel();

    // CALCULATE ATTRIBUTES BASED ON (what should be) the updated XP curve.
    const { updatePower, updateHealth, updateElements } = avCalc(userTotals);  
    const { fire, earth, water, air } = updateElements(character, { qpFire : 0, qpEarth : 0, qpWater : 0, qpAir : 0 }, createdAt);
    const power = updatePower(heroLevel, 0);
    const maxHealth = updateHealth(heroLevel, 0);

    return { power, health, maxHealth,  fire, earth, water, air, heroLevel };
  }).then(({ power, health, maxHealth,  fire, earth, water, air, heroLevel }) =>{
    const theGoods = {power, health,  maxHealth,  fire, earth, water, air};

    
    const updatedAttributes = {
      /* Hero Level minus one since level 1 doesn't count, * 5 for QP each level */
      /* +5 Signup bonus, +5 Strava Bonus */
      qp : ((heroLevel-1) * 5) + 5 + 5,
      power,
      maxHealth,
      armor : 0,
      recovery : BASE_RECOVERY,
      fire,
      earth,
      air,
      water,
      qpPower : 0,
      qpHealth : 0,
      qpArmor : 0,
      qpRecovery : 0,
      qpFire : 0,
      qpEarth : 0,
      qpAir : 0,
      qpWater : 0,
      // Need to change health of avatar if it's over the amount of the new maxHealth
      health : health > maxHealth ? maxHealth : health,
      // tracks whether or not they've updatedtheir stats to account for new level curve
      hasResetStats : true
    };

    // UPDATE AVATAR
    return Avatar.update( updatedAttributes, { where : { id : avatarID }, returning : true });

  }).then((data) =>{
    console.log('success!', data);
    //RETURN UPDATED AVATAR
    return data[1][0];
  }).catch((error) =>{
    console.log('error', error);
    return error;
  });
}

// Health Potion
function healCompletely(avatarID){
  return Avatar.update(
    { health : col('maxHealth'), status : 'Rested' } , { where : { id : avatarID }, returning : true }
  ).then((data) =>{
    //RETURN UPDATED AVATAR
    return data[1][0];
  }).catch((error) =>{
    console.log('error', error);
    return error;
  });
}

// Antidote Potion
function removeInfected(avatarID){
  return Avatar.update(
    { status : 'Recovering' }, { where : { id : avatarID }, returning : true }
  ).then((data) =>{
    //RETURN UPDATED AVATAR
    return data[1][0];
  }).catch((error) =>{
    console.log('error', error);
    return error;
  });
}

function itemEffects(effects, avatarID, email){
  const effectPromises = [];
  effects.forEach((effect) =>{
      switch(effect.name){
        case 'Reset Hero':
          effectPromises.push(resetHero(avatarID, email)); 
          break;
        case 'Heal Hero Completely':
          effectPromises.push(healCompletely(avatarID)); 
          break;
        case 'Remove Infected Status':
          effectPromises.push(removeInfected(avatarID)); 
          break;
        case 'Summon Storming Oni':
          effectPromises.push(instantiateBattle(avatarID, 'Storming Oni')); 
          break;
        case 'Summon Hulking Aggro Crag':
          effectPromises.push(instantiateBattle(avatarID, 'Hulking Aggro Crag')); 
          break;
        case 'Summon Scorching Archfiend': 
          effectPromises.push(instantiateBattle(avatarID, 'Scorching Archfiend'));  
          break;
        case 'High Priestess of the Tides':
          effectPromises.push(instantiateBattle(avatarID, 'High Priestess of the Tides')); 
          break;
        default:
          break;
      }
  });
  return Promise.all(effectPromises)
  .then((results) =>{
    results.forEach((result) => {
      if(result.error){
        throw result.error;
      }
    });
    return results;
  }).catch((error) =>{
    return { error };
  })
}

module.exports = { itemEffects };