const { BATTLE_SCENARIOS } = require('./constants');

function determineScenario(){
  return BATTLE_SCENARIOS[Math.floor(Math.random() * BATTLE_SCENARIOS.length)];
}


module.exports = determineScenario;