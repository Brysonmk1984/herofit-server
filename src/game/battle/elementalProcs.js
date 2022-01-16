const chance = require("chance")();
const { FIRE_CRIT_CHANCE_MOD, WATER_HEAL_MOD, AIR_EVASION_CHANCE_MOD, EARTH_THORNS_MOD, AETHER_IDS_CHANCE_MOD } = require("../CONSTANTS");

// FIRE - offensive trait - takes in aggressor's total element amount, and uses the average as the crit damage calculated on aggressors round
function determineFireCrit(fire, d) {
  let critChance = Math.floor(Number((fire * 3) / (fire * 3 + FIRE_CRIT_CHANCE_MOD)).toFixed(2) * 100);
  if (critChance > 60) {
    critChance = 60;
  }
  const isCrit = chance.bool({ likelihood: critChance });
  const averageElms = Math.floor((d / 4) * 1.85);
  const critDamage = isCrit ? averageElms : 0;
  //console.log('FIRE - ', { critChance, critDamage });
  return { critChance, critDamage };
}

// AIR - defensive trait - takes in defender's air amount, and aggressors damage calculated on aggressors round
function determineAirEvade(air) {
  let evadeChance = Math.floor(Number((air * 5) / (air * 5 + AIR_EVASION_CHANCE_MOD)).toFixed(2) * 100);
  //console.log(air, evadeChance);
  if (evadeChance > 60) {
    evadeChance = 60;
  }
  const evaded = chance.bool({ likelihood: evadeChance });

  return { evaded };
}

// WATER - defensive trait but takes place on offensive rounds - takes in defender's water amount, calculated on attackers attacking round - healed after damage has been dealt (but will not allow death)
function determineWaterHeal(water, d) {
  let healingFactor = Number((water * 5) / (water * 5 + WATER_HEAL_MOD)).toFixed(2);
  if (healingFactor > 0.45) {
    healingFactor = 0.45;
  }
  const amountHealed = Math.floor(d * healingFactor);
  //console.log('WATER - ', { healingFactor, amountHealed });
  return { healingFactor, amountHealed };
}

// EARTH - defensive trait - takes in defender's earth amount, and aggressors damage calculated on aggressors attacking round
function determineEarthThorns(earth, d) {
  let thornsFactor = Number((earth * 5) / (earth * 5 + EARTH_THORNS_MOD)).toFixed(2);
  if (thornsFactor > 0.45) {
    thornsFactor = 0.45;
  }
  const thornsDamageToAttacker = Math.floor(thornsFactor * d);
  //console.log('EARTH - ', { thornsFactor, thornsDamageToAttacker });
  return { thornsFactor, thornsDamageToAttacker };
}

// Aether - late game offensive trait - takes in attacker's aether amount and calculates a chance for taking an extra battle turn
function determineIDS(aether, goesFirst) {
  let idsChance = Math.floor(Number((aether * 3) / (aether * 3 + AETHER_IDS_CHANCE_MOD)).toFixed(2) * 100);
  if (idsChance > 60) {
    idsChance = 60;
  }
  const isIDS = chance.bool({ likelihood: idsChance });
  if (isIDS) {
    const gf = goesFirst === "Avatar" ? "Foe" : "Avatar";
    return { ids: true, gf };
  }
  return { ids: false, gf: goesFirst };
}

module.exports = {
  determineFireCrit,
  determineAirEvade,
  determineWaterHeal,
  determineEarthThorns,
  determineIDS,
};
