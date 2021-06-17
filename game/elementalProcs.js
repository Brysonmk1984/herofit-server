const chance = require('chance')();
const { FIRE_CRIT_CHANCE_MOD, WATER_HEAL_MOD, AIR_EVASION_CHANCE_MOD, EARTH_THORNS_MOD } = require('./CONSTANTS');

// FIRE - offensive trait - takes in aggressor's total element amount, and uses the average as the crit damage calculated on aggressors round
function determineFireCrit(fire, d){
  let critChance = Number((fire*3)/((fire*3)+(FIRE_CRIT_CHANCE_MOD*500))).toFixed(2) * 100;
  if(critChance > 60){
    critChance = 60;
  }
  const isCrit = chance.bool({ likelihood: critChance });
  const averageElms = Math.floor(d/4 * 1.5);
  const critDamage = isCrit ? averageElms : 0;
  //console.log('FIRE - ', { critChance, critDamage });
  return { critChance, critDamage };
}

// AIR - defensive trait - takes in defender's air amount, and aggressors damage calculated on aggressors round
function determineAirEvade(air, d){
  //console.log('the air params - ',air,d);
  let evadeChance = Number((air*10)/((air*10)+(AIR_EVASION_CHANCE_MOD*1000))).toFixed(2) * 100;
  if(evadeChance > 60){
    evadeChance = 60;
  }

  const evaded = chance.bool({ likelihood: evadeChance});
  const damageAvoided = evaded ? d : 0;
  //console.log('AIR - ', { evadeChance, damageAvoided, evaded });
  return { evadeChance, damageAvoided, evaded};
}

// WATER - defensive trait but takes place on offensive rounds - takes in defender's water amount, calculated on attackers attacking round - healed after damage has been dealt (but will not allow death)
function determineWaterHeal(water, d){  
  let healingFactor = Number((water*3)/((water*3)+(WATER_HEAL_MOD))).toFixed(2);
  if(healingFactor > .45){
    healingFactor = .45;
  }
  const amountHealed = Math.floor(d * healingFactor);
  //console.log('WATER - ', { healingFactor, amountHealed });
  return { healingFactor, amountHealed };
}

// EARTH - defensive trait - takes in defender's earth amount, and aggressors damage calculated on aggressors attacking round
function determineEarthThorns(earth, d){
  let thornsFactor = Number((earth*5)/(earth*5+EARTH_THORNS_MOD)).toFixed(2);
  if(thornsFactor > .45){
    thornsFactor = .45;
  }
  const thornsDamageToAttacker = Math.floor(thornsFactor * d);
  //console.log('EARTH - ', { thornsFactor, thornsDamageToAttacker });
  return { thornsFactor, thornsDamageToAttacker };
}

module.exports = { determineFireCrit, determineAirEvade, determineWaterHeal, determineEarthThorns};