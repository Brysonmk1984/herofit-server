
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
  avatarPowerMod : .02,
  avatarHealthMod : 0,
  foePowerMod : .02,
  foeHealthMod : 0,
},{
  id : 3,
  description : "Foe attacked unprepared avatar",
  avatarPowerMod : 0,
  avatarHealthMod : -.03,
  foePowerMod : .03,
  foeHealthMod : 0,
},{
  id : 4,
  description : "Foe attacked defending avatar",
  avatarPowerMod : 0,
  avatarHealthMod : .03,
  foePowerMod : 0,
  foeHealthMod : 0,
},{
  id : 5,
  description : "Both avatar and foe fought defensively",
  avatarPowerMod : 0,
  avatarHealthMod : .01,
  foePowerMod : 0,
  foeHealthMod : .01,
}];

const FOE_NON_ACTION = 0;
const AVATAR_NON_ACTION = 3;

const FOE_MOD = {
  HEALTH : 1,
  QP : 1,
  POWER : 1
};

const OUTCOME_XP = {
  win : 30,
  loss : 15,
  draw : 20,
  dko : 25
};

const REVIVE_AMOUNT = 1;


module.exports = { REGENERATION_RATE, RESTED_THRESHOLD, BATTLE_SCENARIOS, FOE_MOD, OUTCOME_XP, REVIVE_AMOUNT, FOE_NON_ACTION, AVATAR_NON_ACTION };