const { BATTLE_SCENARIOS } = require("../CONSTANTS");

// Calculates the bonus to both Avatar and Foe depending on scenario
function calcScenarioBonuses(avatar, foe, scenario) {
  const ap = avatar.power;
  const ah = avatar.health;

  const fp = foe.power;
  const fh = foe.health;

  avatar.power = ap + ap * scenario.avatarPowerMod;
  avatar.health = ah + ah * scenario.avatarHealthMod;

  foe.power = fp + fp * scenario.foePowerMod;
  foe.health = fh + fh * scenario.foeHealthMod;

  return { sAvatar: avatar, sFoe: foe };
}

// Determines which of the 6 scenarios are going to be the stage for battle, chosen at random
function determineScenario(beginnersLuck) {
  // If beginners luck, only choose from favorable or neutral scenarios
  if (beginnersLuck) {
    const positiveScenarios = [0, 2, 4, 5];
    const scenarioIndex =
      positiveScenarios[Math.floor(Math.random() * positiveScenarios.length)];
    return BATTLE_SCENARIOS[scenarioIndex];
  }
  return BATTLE_SCENARIOS[Math.floor(Math.random() * BATTLE_SCENARIOS.length)];
}

module.exports = { calcScenarioBonuses, determineScenario };
