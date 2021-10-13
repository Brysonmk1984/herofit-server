
// FOR LEVEL UPS
const LEVEL_CURVE = 1.39;
const XP_BASE_LEVEL = 66;
const QP_PER_LEVEL = 5;
const POWER_PER_LEVEL = 5;
const MAX_HEALTH_PER_LEVEL = 5;

// FOR AVATARS
const BASE_POWER = 100;
const BASE_HEALTH = 100;
const BASE_RECOVERY = 5;
const MINUTES_PER_POWER = 30;
const MINUTES_PER_ELM = 30;
const MINUTES_PER_ALL_ELM = 120;

// ACTIVITIES
const ACTIVITY_MAP = { 'Run' : 'run', 'Hike' : 'hike', 'Ride' : 'ride', 'Walk' : 'walk', 'StairStepper' : 'stairStepper', 'Elliptical' : 'elliptical', 'Swim' : 'swim', 'WeightTraining' : 'weightTraining', 'Yoga' : 'yoga', 'Rowing' : 'rowing', 'Crossfit' : 'crossfit', 'StandUpPaddling' : 'standUpPaddling', 'Workout' : 'workout', 'VirtualRide' : 'ride', 'VirtualRun' : 'run', 'AlpineSki' : 'ski', 'BackcountrySki' : 'ski', 'NordicSki' : 'ski', 'Snowboard' : 'snowboard', 'Snowshoe' : 'snowshoe', 'Kayaking' : 'kayaking' };
const COMPETITIVE_ACTIVITIES = ['run', 'hike', 'ride', 'walk'];
const NONCOMPETITIVE_ACTIVITIES = ['stairStepper', 'elliptical', 'swim', 'weightTraining', 'yoga', 'rowing', 'crossfit', 'standUpPaddling', 'ski', 'snowboard', 'snowshoe', 'kayaking', 'workout',];
const TIME_AND_HALF_ACTIVITIES = ['stairStepper', 'elliptical', 'swim', 'crossfit', 'run'];
const NON_TIME_AND_HALF_ACTIVITIES = ['ride', 'weightTraining', 'hike', 'yoga', 'walk', 'rowing', 'standUpPaddling', 'ski', 'snowboard', 'snowshoe', 'kayaking', 'workout'];

// FOR BATTLES
const REGENERATION_RATE = 5;
const RESTED_THRESHOLD = 1;
const BATTLE_SCENARIOS = [{
  id : 0,
  description : "Avatar attacked unprepared foe",
  avatarPowerMod : .05,
  avatarHealthMod : 0,
  foePowerMod : 0,
  foeHealthMod : -.05,
},{
  id : 1,
  description : "Avatar attacked defending foe",
  avatarPowerMod : 0,
  avatarHealthMod : 0,
  foePowerMod : 0,
  foeHealthMod : .1,
},{
  id : 2,
  description : "Avatar and Foe met on open field",
  avatarPowerMod : .1,
  avatarHealthMod : 0,
  foePowerMod : .1,
  foeHealthMod : 0,
},{
  id : 3,
  description : "Foe attacked unprepared avatar",
  avatarPowerMod : 0,
  avatarHealthMod : -.05,
  foePowerMod : .05,
  foeHealthMod : 0,
},{
  id : 4,
  description : "Foe attacked defending avatar",
  avatarPowerMod : 0,
  avatarHealthMod : .1,
  foePowerMod : 0,
  foeHealthMod : 0,
},{
  id : 5,
  description : "Both avatar and foe fought defensively",
  avatarPowerMod : 0,
  avatarHealthMod : .1,
  foePowerMod : 0,
  foeHealthMod : .1,
}];

const FOE_NON_ACTION = 0;
const AVATAR_NON_ACTION = 3;

const FOE_MOD = {
  HEALTH : .83,
  QP : 1,
  POWER : .83
};


const OUTCOME_XP = {
  base : 20,
  lossMultiplier : .25,
  drawMultiplier : .5,
  dkoMultiplier : .7
};
// Used in calculation to increase the deduction of XP for weaker opponents
const FOE_DIFFICULTY_XP_MOD_FACTOR = 3.5;
const BXP_LEVEL_CURVE = 2;
const BONUS_XP_EXPONENT = .9;
const PT_EXPONENT = 1.2;


const REVIVE_AMOUNT = 1;
// higher is less effective
const RECOVER_EARLY_MOD = 700;
// higher is more effective
const RECOVERY_EFFECTIVENESS_MOD = 45;

// DO BATTLE

// lower is more effective
const ARMOR_DRF = 1.7;

// variation on the power each attack (one per turn)
const DAMAGE_PERCENT_PER_TURN = .2;
const DAMAGE_VARIANCE_PER_TURN = .07;
const DAMAGE_VARIANCE_RANGE = [DAMAGE_PERCENT_PER_TURN - DAMAGE_VARIANCE_PER_TURN, DAMAGE_PERCENT_PER_TURN + DAMAGE_VARIANCE_PER_TURN];

// ELEMENTAL variation on the elemental power each attack (turns 2,3,6,7,10,11)
const ELM_DAMAGE_PERCENT_PER_TURN = .15;
const ELM_DAMAGE_VARIANCE_PER_TURN = .05;
const ELM_DAMAGE_VARIANCE_RANGE = [ELM_DAMAGE_PERCENT_PER_TURN - ELM_DAMAGE_VARIANCE_PER_TURN, ELM_DAMAGE_PERCENT_PER_TURN + ELM_DAMAGE_VARIANCE_PER_TURN];

// TWEAKS CURVE, CAREFUL MODIFYING THIS... WOULD NEED TO UPDATE TABLE ON EVENT PAGE
const FIRE_CRIT_CHANCE_MOD = 1650;
const WATER_HEAL_MOD = 5040;
const AIR_EVASION_CHANCE_MOD = 5500;
const EARTH_THORNS_MOD = 5500;
const AETHER_IDS_CHANCE_MOD = 1650;

// MAKES GAME EASIER FOR BEGINNERS AND MORE DIFFICULT FOR VETERANS
const BEGINNERS_LUCK_MAX_XP = 2587; // Level 15
const BEGINNERS_LUCK_LIKELIHOOD = 66;
const LOW_LEVEL = 15;
const HIGH_LEVEL = 100;

// Applies to mid level +
const LEVEL_DIFFICULTY_MOD = 1.36;
// Applies to high level (on top of mid level difficulty mod)
const HIGH_LEVEL_DIFFICULTY_MOD = 1.25;

// Photon Token find
const PTFIND_BASE_DROP_RATE = 33;
const PTFIND_BASE_AMOUNT = 15;
// higher is more effective
const PTFIND_EFFECTIVENESS_MOD = 45;

// MAX LEVEL, ALBEDO LEVELS FOLLOW
const MAX_LEVEL = 100;

module.exports = { 
  LEVEL_CURVE, XP_BASE_LEVEL, QP_PER_LEVEL, POWER_PER_LEVEL, MAX_HEALTH_PER_LEVEL,
  BASE_POWER, BASE_HEALTH, BASE_RECOVERY, MINUTES_PER_POWER, MINUTES_PER_ELM, MINUTES_PER_ALL_ELM,
  ACTIVITY_MAP, COMPETITIVE_ACTIVITIES, NONCOMPETITIVE_ACTIVITIES, TIME_AND_HALF_ACTIVITIES, NON_TIME_AND_HALF_ACTIVITIES,
  REGENERATION_RATE, RESTED_THRESHOLD, BATTLE_SCENARIOS,
  FOE_NON_ACTION, AVATAR_NON_ACTION,
  FOE_MOD, OUTCOME_XP, FOE_DIFFICULTY_XP_MOD_FACTOR,BXP_LEVEL_CURVE, BONUS_XP_EXPONENT, PT_EXPONENT,
  REVIVE_AMOUNT, RECOVER_EARLY_MOD, RECOVERY_EFFECTIVENESS_MOD,
  ARMOR_DRF, DAMAGE_VARIANCE_RANGE, ELM_DAMAGE_VARIANCE_RANGE, FIRE_CRIT_CHANCE_MOD, AIR_EVASION_CHANCE_MOD, WATER_HEAL_MOD, EARTH_THORNS_MOD, AETHER_IDS_CHANCE_MOD,
  BEGINNERS_LUCK_MAX_XP, BEGINNERS_LUCK_LIKELIHOOD, LEVEL_DIFFICULTY_MOD, LOW_LEVEL, HIGH_LEVEL, HIGH_LEVEL_DIFFICULTY_MOD,
  PTFIND_BASE_DROP_RATE, PTFIND_BASE_AMOUNT, PTFIND_EFFECTIVENESS_MOD, MAX_LEVEL
};