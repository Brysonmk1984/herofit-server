const chance = require('chance')();
const { FIRE_CRIT_CHANCE_MOD, WATER_HEAL_EXPONENT, AIR_EVASION_CHANCE_MOD, EARTH_THORNS_EXPONENT } = require('./constants');

// FIRE - offensive trait - takes in aggressor's fire amount, calculated on aggressors elemental attacking round
function determineFireCrit(fire, d){
  let critChance = Number((fire*10)/((fire*10)+(FIRE_CRIT_CHANCE_MOD*200))).toFixed(2) * 100;
  if(critChance > 60){
    critChance = 60;
  }
  //console.log('CC!!!', critChance);
  const isCrit = chance.bool({ likelihood: critChance});
  const netDamage = isCrit ? 2 * d : d;
  const critDamage = isCrit ? (netDamage - d) : 0;
  return { critChance, critDamage, netDamage};
}

// AIR - defensive trait - takes in defender's air amount, and aggressors damag calculated on aggressors elemental attacking round
function determineAirEvade(air, d){
  //console.log('the air params - ',air,d);
  let evadeChance = Number((air*10)/((air*10)+(AIR_EVASION_CHANCE_MOD*1000))).toFixed(2) * 100;
  if(evadeChance > 60){
    evadeChance = 60;
  }
  //console.log('EVADE CHANCE!!!', evadeChance);
  const evaded = chance.bool({ likelihood: evadeChance});
  const damageAvoided = evaded ? d : 0;
  return { evadeChance, damageAvoided, evaded};
}

// WATER - defensive trait but takes place on offensive rounds - takes in defender's water amount, calculated on attackers attacking round - healed after damage has been dealt (but will not allow death)
function defermineWaterHeal(water){
  const healingFactor =  Number((1/Math.pow(water, WATER_HEAL_EXPONENT)).toFixed(2));
	const amountHealed = Math.floor(water * healingFactor);
  
  return { healingFactor, amountHealed };
}

// EARTH - defensive trait - takes in defender's earth amount, and aggressors damage calculated on aggressors elemental attacking round
function determineEarthThorns(earth, d){
  const thornsFactor =  Number((1/Math.pow(earth, EARTH_THORNS_EXPONENT)).toFixed(2));

  console.log('THORNS FACTOR!!!', thornsFactor);

  const thornsDamageToAttacker = Math.floor(thornsFactor * d);

  return { thornsFactor, thornsDamageToAttacker };
}

module.exports = { determineFireCrit, determineAirEvade, defermineWaterHeal, determineEarthThorns};