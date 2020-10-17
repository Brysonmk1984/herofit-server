const { BATTLE_SCENARIOS } = require('./constants');

// Calculates the bonus to both Avatar and Foe depending on scenario
function _calcScenarioBonuses(avatar, foe, scenario){
  const ap = avatar.power;
  const ah = avatar.health;

  const fp = foe.power;
  const fh = foe.health;

  avatar.power = ap + (ap * scenario.avatarPowerMod);
  avatar.health = ah + (ah * scenario.avatarHealthMod);

  foe.power = fp + (fp * scenario.foePowerMod);
  foe.health = fh + (fh * scenario.foeHealthMod);

  return { sAvatar : avatar, sFoe : foe };
}

// Determines which of the 6 scenarios are going to be the stage for battle, chosen at random
function _determineScenario(scenario){
  if(scenario){
    return BATTLE_SCENARIOS[scenario];
  }
  return BATTLE_SCENARIOS[Math.floor(Math.random() * BATTLE_SCENARIOS.length)];
}

// Choose scenario then apply bonuses to Avatar & Foe. Return Avatar, Foe, and Scenario
function doScenarioAndBonus(avatar, foe, scenarioNum = null){
  const scenario = _determineScenario(scenarioNum);
  const { sAvatar, sFoe } = _calcScenarioBonuses(avatar, foe, scenario);

  return { sAvatar, sFoe, scenario };
}

module.exports = doScenarioAndBonus;

