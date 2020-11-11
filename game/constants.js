
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
const ACTIVITY_MAP = { 'Run' : 'run', 'Hike' : 'hike', 'Ride' : 'ride', 'Walk' : 'walk', 'StairStepper' : 'stairStepper', 'Elliptical' : 'elliptical', 'Swim' : 'swim', 'WeightTraining' : 'weightTraining', 'Yoga' : 'yoga', 'Rowing' : 'rowing', 'Crossfit' : 'crossfit', 'StandUpPaddling' : 'standUpPaddling', 'Workout' : 'workout', 'VirtualRide' : 'ride', 'VirtualRun' : 'run' };
const COMPETITIVE_ACTIVITIES = ['run', 'hike', 'ride', 'walk'];
const NONCOMPETITIVE_ACTIVITIES = ['stairStepper', 'elliptical', 'swim', 'weightTraining', 'yoga', 'rowing', 'crossfit', 'standUpPaddling'];

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
  HEALTH : 1.2,
  QP : .8,
  POWER : .8
};

const OUTCOME_XP = {
  win : 30,
  loss : 15,
  draw : 20,
  dko : 25
};

const REVIVE_AMOUNT = 1;

// DO BATTLE
const ARMOR_DRF = 4;


module.exports = { 
  LEVEL_CURVE, XP_BASE_LEVEL, QP_PER_LEVEL, 
  BASE_POWER, MINUTES_PER_POWER, MINUTES_PER_ELM, MINUTES_PER_ALL_ELM,
  ACTIVITY_MAP, COMPETITIVE_ACTIVITIES, NONCOMPETITIVE_ACTIVITIES,
  REGENERATION_RATE, RESTED_THRESHOLD, BATTLE_SCENARIOS,
  FOE_NON_ACTION, AVATAR_NON_ACTION,
  FOE_MOD, OUTCOME_XP, REVIVE_AMOUNT,
  ARMOR_DRF
};