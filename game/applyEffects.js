const { Op, literal, col, fn, QueryTypes } = require("sequelize");
const Avatar = require('../db').Avatar;
const UserTotal = require('../db').UserTotal;
const xpCalc = require('./upgrades/xpCalc');
const avCalc = require('./upgrades/avCalc');
const { COMPETITIVE_ACTIVITIES, NONCOMPETITIVE_ACTIVITIES, BASE_RECOVERY } = require('./constants');

// Reset Capsul (just meant for one time balance change)
// Requires User Totals being passed into the function
function resetQPByXp(avatarID, email){
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
    console.log('THEG', theGoods);
    
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
      health : health > maxHealth ? maxHealth : health
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

// Retrocausality Capsul
function resetQP(id){
  return Avatar.findOne({
    attributes : ['qp', 'qpPower', 'qpHealth', 'qpArmor', 'qpRecovery', 'qpFire', 'qpEarth', 'qpAir', 'qpWater',
    'power', 'maxHealth', 'armor', 'recovery', 'fire', 'earth', 'air', 'water', 'health', 'activityXP', 'battleXP'],
    where : { id }
  }).then(({ qp, qpPower, qpHealth, qpArmor, qpRecovery, qpFire, qpEarth, qpAir, qpWater, power, maxHealth, armor, recovery, fire, earth, air, water, health }) =>{

    const updatedAttributes = {
      qp : qp + qpPower + qpHealth + qpArmor + qpRecovery + qpFire + qpEarth + qpAir + qpWater,
      power : power - qpPower,
      maxHealth : (maxHealth - qpHealth),
      // Values shouldn't ever go below zero, but just in case
      armor : (armor - qpArmor) > 0 ? (armor - qpArmor) : 0,
      recovery : (recovery - qpRecovery) > 0 ? (recovery - qpRecovery) : BASE_RECOVERY,
      fire : (fire - qpFire) > 0 ? (fire - qpFire) : 0,
      earth : (earth - qpEarth) > 0 ? (earth - qpEarth) : 0,
      air : (air - qpAir) > 0 ? (air - qpAir) : 0,
      water: (water - qpWater) > 0 ? (water - qpWater) : 0,
      qpPower : 0,
      qpHealth : 0,
      qpArmor : 0,
      qpRecovery : 0,
      qpFire : 0,
      qpEarth : 0,
      qpAir : 0,
      qpWater : 0,
      // Need to change health of avatar if it's over the amount of the new maxHealth
      health : health > (maxHealth - qpHealth) ? (maxHealth - qpHealth) : health
    };

    return Avatar.update(
      updatedAttributes,
      { where : { id }, returning : true }
    );
  }).then((data) =>{
    console.log('success!', data);
    return data[1][0];
  }).catch((error) =>{
    console.log('error', error);
    return error;
  });
}

// Health Potion
function healCompletely(avatarID){
  return Avatar.update(
    { health : col('maxHealth') } , { where : { id : avatarID }, returning : true }
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
      switch(effect){
        case 'Reset QP':
          effectPromises.push(resetQP(avatarID)); 
        case 'Reset QP by XP':
            effectPromises.push(resetQPByXp(avatarID, email)); 
        case 'Heal Hero Completely':
          effectPromises.push(healCompletely(avatarID)); 
        case 'Remove Infected Status':
          effectPromises.push(removeInfected(avatarID)); 
        default:
          break;
      }
  });

  return Promise.all(effectPromises);
}

module.exports = { itemEffects };