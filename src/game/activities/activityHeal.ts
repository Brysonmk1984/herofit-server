import { AETHER_TD_CHANCE_MOD } from "../CONSTANTS";

function activityHeal(health: number, maxHealth: number, aether: number, xpGain: number) {
  if (!aether) {
    return health;
  }
  const healPercent = +((aether * 3) / (aether * 3 + AETHER_TD_CHANCE_MOD)).toFixed(2) * 100;
  const activityHealSessions = xpGain / 60;
  const modifiedHealPercent = healPercent * activityHealSessions * 0.01;
  let adjustedHealth = Math.floor(health + maxHealth * modifiedHealPercent);
  if (adjustedHealth > maxHealth) {
    adjustedHealth = maxHealth;
  }
  return adjustedHealth;
}

function passiveAbilityHeal(health: number, maxHealth: number, healingBonusPercent: number, xpGain: number) {
  const healPercent = healingBonusPercent;
  const activityHealSessions = xpGain / 60;
  const modifiedHealPercent = healPercent * activityHealSessions * 0.01;
  let adjustedHealth = Math.floor(health + maxHealth * modifiedHealPercent);
  if (adjustedHealth > maxHealth) {
    adjustedHealth = maxHealth;
  }
  return adjustedHealth;
}

export { activityHeal, passiveAbilityHeal };
