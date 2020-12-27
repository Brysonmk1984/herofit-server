
// FOR LEVEL UPS
const LEVEL_CURVE = 1.2;
const XP_BASE_LEVEL = 99;
const QP_PER_LEVEL = 5;

// FOR AVATARS
const BASE_POWER = 100;
const MINUTES_PER_POWER = 30;
const MINUTES_PER_ELM = 30;
const MINUTES_PER_ALL_ELM = 120;

// ACTIVITIES
const ACTIVITY_MAP = { 'Run' : 'run', 'Hike' : 'hike', 'Ride' : 'ride', 'Walk' : 'walk', 'StairStepper' : 'stairStepper', 'Elliptical' : 'elliptical', 'Swim' : 'swim', 'WeightTraining' : 'weightTraining', 'Yoga' : 'yoga', 'Rowing' : 'rowing', 'Crossfit' : 'crossfit', 'StandUpPaddling' : 'standUpPaddling', 'Workout' : 'workout', 'VirtualRide' : 'ride', 'VirtualRun' : 'run', 'AlpineSki' : 'ski', 'BackcountrySki' : 'ski', 'NordicSki' : 'ski', 'Snowboard' : 'snowboard', 'Snowshoe' : 'snowshoe' };
const COMPETITIVE_ACTIVITIES = ['run', 'hike', 'ride', 'walk'];
const NONCOMPETITIVE_ACTIVITIES = ['stairStepper', 'elliptical', 'swim', 'weightTraining', 'yoga', 'rowing', 'crossfit', 'standUpPaddling', 'ski', 'snowboard', 'snowshoe', 'workout'];

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
  foeHealthMod : .05,
},{
  id : 2,
  description : "Avatar and Foe met on open field",
  avatarPowerMod : .05,
  avatarHealthMod : 0,
  foePowerMod : .05,
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
  avatarHealthMod : .05,
  foePowerMod : 0,
  foeHealthMod : 0,
},{
  id : 5,
  description : "Both avatar and foe fought defensively",
  avatarPowerMod : 0,
  avatarHealthMod : .05,
  foePowerMod : 0,
  foeHealthMod : .05,
}];

const FOE_NON_ACTION = 0;
const AVATAR_NON_ACTION = 3;

const FOE_MOD = {
  HEALTH : .9,
  QP : .6,
  POWER : .7
};


const OUTCOME_XP = {
  win : 20,
  loss : 5,
  draw : 10,
  dko : 15
};

const REVIVE_AMOUNT = 1;
const KO_RECOVERY_RETARDER = .5;

// DO BATTLE

// lower is more effective
const ARMOR_DRF = 3.5;

// variation on the power each attack (one per turn)
const DAMAGE_PERCENT_PER_TURN = .2;
const DAMAGE_VARIANCE_PER_TURN = .075;
const DAMAGE_VARIANCE_RANGE = [DAMAGE_PERCENT_PER_TURN - DAMAGE_VARIANCE_PER_TURN, DAMAGE_PERCENT_PER_TURN + DAMAGE_VARIANCE_PER_TURN];

// ELEMENTAL variation on the elemental power each attack (turns 2,3,6,7,10,11)
const ELM_DAMAGE_PERCENT_PER_TURN = .3;
const ELM_DAMAGE_VARIANCE_PER_TURN = .1;
const ELM_DAMAGE_VARIANCE_RANGE = [ELM_DAMAGE_PERCENT_PER_TURN - ELM_DAMAGE_VARIANCE_PER_TURN, ELM_DAMAGE_PERCENT_PER_TURN + ELM_DAMAGE_VARIANCE_PER_TURN];

module.exports = { 
  LEVEL_CURVE, XP_BASE_LEVEL, QP_PER_LEVEL, 
  BASE_POWER, MINUTES_PER_POWER, MINUTES_PER_ELM, MINUTES_PER_ALL_ELM,
  ACTIVITY_MAP, COMPETITIVE_ACTIVITIES, NONCOMPETITIVE_ACTIVITIES,
  REGENERATION_RATE, RESTED_THRESHOLD, BATTLE_SCENARIOS,
  FOE_NON_ACTION, AVATAR_NON_ACTION,
  FOE_MOD, OUTCOME_XP, REVIVE_AMOUNT, KO_RECOVERY_RETARDER,
  ARMOR_DRF, DAMAGE_VARIANCE_RANGE, ELM_DAMAGE_VARIANCE_RANGE
};