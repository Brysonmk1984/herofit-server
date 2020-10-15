
const REGENERATION_RATE = 5;
const RESTED_THRESHOLD = .8;
const BATTLE_SCENARIOS = [{
  id : 1,
  description : "Avatar attacked unprepared foe",
  avatarPowerMod : .1,
  avatarHealthMod : 0,
  foePowerMod : 0,
  foeHealthMod : -.1,
},{
  id : 2,
  description : "Avatar attacked defending foe",
  avatarPowerMod : 0,
  avatarHealthMod : 0,
  foePowerMod : 0,
  foeHealthMod : .1,
},{
  id : 3,
  description : "Avatar and Foe met on open field",
  avatarPowerMod : .1,
  avatarHealthMod : 0,
  foePowerMod : .1,
  foeHealthMod : 0,
},{
  id : 4,
  description : "Foe attacked unprepared avatar",
  avatarPowerMod : 0,
  avatarHealthMod : -.1,
  foePowerMod : .1,
  foeHealthMod : 0,
},{
  id : 5,
  description : "Foe attacked defending avatar",
  avatarPowerMod : 0,
  avatarHealthMod : .1,
  foePowerMod : 0,
  foeHealthMod : 0,

},{
  id : 6,
  description : "Both avatar and foe fought defensively",
  avatarPowerMod : 0,
  avatarHealthMod : .1,
  foePowerMod : 0,
  foeHealthMod : .1,
}];

const FOE_MOD = {
  XP : .7,
  HEALTH : .7,
  QP : .8,
  POWER : .8
}

module.exports = { REGENERATION_RATE, RESTED_THRESHOLD, BATTLE_SCENARIOS, FOE_MOD };