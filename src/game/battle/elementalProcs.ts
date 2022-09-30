import { FIRE_CRIT_CHANCE_MOD, WATER_HEAL_MOD, AIR_EVASION_CHANCE_MOD, EARTH_THORNS_MOD, AETHER_TD_CHANCE_MOD } from "../CONSTANTS";
import Chance from "chance";
import { AvatarOrFoeString, ElementalTraitBoost } from "../../types/BackendOnlyTypes";
const chance = Chance();

// FIRE - offensive trait - takes in aggressor's total element amount, and uses the average as the crit damage calculated on aggressors round
function determineFireCrit(fire: number, d: number, boost : ElementalTraitBoost = [1,1]) {
  let critChance = Math.floor(+((fire * 3) / (fire * 3 + FIRE_CRIT_CHANCE_MOD)).toFixed(2) * boost[0] * 100) ;
  const maxCritChance = 60 * boost[1];
  if (critChance > maxCritChance) {
    critChance = maxCritChance;
  }
  const isCrit = chance.bool({ likelihood: critChance });
  const averageElms = Math.floor((d / 4) * 1.85);
  //fallback for low element amounts
  const thirdOfDamage = Math.floor(d/3);
  const bonusDamage = averageElms > thirdOfDamage ? averageElms : thirdOfDamage;
  const critDamage = isCrit ? bonusDamage : 0;
  //console.log('FIRE - ', { critChance, critDamage, boost });
  return { critChance, critDamage };
}

// AIR - defensive trait - takes in defender's air amount, and aggressors damage calculated on aggressors round
function determineAirEvade(air: number, boost : ElementalTraitBoost = [1,1]) {
  let evadeChance = Math.floor(+((air * 5) / (air * 5 + AIR_EVASION_CHANCE_MOD)).toFixed(2)* boost[0] * 100) ;
  const maxEvadeChance = 60 * boost[1];
  if (evadeChance > maxEvadeChance) {
    evadeChance = maxEvadeChance;
  }
  const evaded = chance.bool({ likelihood: evadeChance });
  //console.log('AIR - ', { evadeChance, evaded, boost });
  return { evaded };
}

// WATER - defensive trait but takes place on offensive rounds - takes in defender's water amount, calculated on attackers attacking round - healed after damage has been dealt (but will not allow death)
function determineWaterHeal(water: number, d: number, boost : ElementalTraitBoost = [1,1]) {
  let healingFactor = +((water * 5) / (water * 5 + WATER_HEAL_MOD)).toFixed(2) * boost[0];
  const maxHealingFactor = 0.45 * boost[1];
  if (healingFactor > maxHealingFactor) {
    healingFactor = maxHealingFactor;
  }
  const amountHealed = Math.floor(d * healingFactor);
  //console.log('WATER - ', { healingFactor, amountHealed, boost });
  return { healingFactor, amountHealed };
}

// EARTH - defensive trait - takes in defender's earth amount, and aggressors damage calculated on aggressors attacking round
function determineEarthThorns(earth: number, d: number, boost : ElementalTraitBoost= [1,1]) {
  let thornsFactor = +(((earth * 5) / (earth * 5 + EARTH_THORNS_MOD))).toFixed(2) * boost[0];
  const maxThornsFactor = 0.45 * boost[1];
  if (thornsFactor > maxThornsFactor) {
    thornsFactor = maxThornsFactor;
  }
  const thornsDamageToAttacker = Math.floor(thornsFactor * d);
  //console.log('EARTH - ', { thornsFactor, thornsDamageToAttacker, boost });
  return { thornsFactor, thornsDamageToAttacker };
}

// Aether - late game offensive trait - takes in attacker's aether amount and calculates a chance for taking an extra battle turn
function determineTD(aether: number, goesFirst: AvatarOrFoeString) {
  let tdChance = Math.floor(+((aether * 3) / (aether * 3 + AETHER_TD_CHANCE_MOD)).toFixed(2) * 100);
  if (tdChance > 60) {
    tdChance = 60;
  }
  const isTD = chance.bool({ likelihood: tdChance });
  if (isTD) {
    const gf = goesFirst === "Avatar" ? "Foe" : "Avatar";
    return { td: true, gf: gf as AvatarOrFoeString };
  }
  return { td: false, gf: goesFirst };
}

export { determineFireCrit, determineAirEvade, determineWaterHeal, determineEarthThorns, determineTD };
