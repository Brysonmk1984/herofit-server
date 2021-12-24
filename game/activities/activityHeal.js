const { AETHER_IDS_CHANCE_MOD } = require("../CONSTANTS");

function activityHeal(health, maxHealth, aether, xpGain) {
  if (!aether) {
    return health;
  }
  const healPercent = Number((aether * 3) / (aether * 3 + AETHER_IDS_CHANCE_MOD)).toFixed(2) * 100;
  const activityHealSessions = xpGain / 60;
  const modifiedHealPercent = healPercent * activityHealSessions * 0.01;
  let adjustedHealth = health + maxHealth * modifiedHealPercent;
  if (adjustedHealth > maxHealth) {
    adjustedHealth = maxHealth;
  }
  return adjustedHealth;
}

module.exports = activityHeal;
