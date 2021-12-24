let {
  LEVEL_CURVE,
  XP_BASE_LEVEL,
  QP_PER_LEVEL,
  POWER_PER_LEVEL,
  MAX_HEALTH_PER_LEVEL,
  TIME_AND_HALF_ACTIVITIES,
  RECOVERY_EFFECTIVENESS_MOD,
  MAX_LEVEL,
} = require("../CONSTANTS.js");

// PRIMARY FUNCTIONS FOR HANDLING EXPERIENCE POINTS AND LEVEL UPS
function xpCalc(activityXP, battleXP) {
  const aXP = activityXP,
    bXP = battleXP,
    tXP = aXP + bXP;

  return (xpReturn = {
    // GIVES XP REQUIRED FOR NEXT LEVEL BASED ON DB VALUES
    getNextLevel: function (levelsAway = 0) {
      const exponent = LEVEL_CURVE;
      const baseXP = XP_BASE_LEVEL;
      const { total } = xpReturn.getCurrentLevel();

      return Math.floor(baseXP * Math.pow(total + levelsAway, exponent)) + 1;
    },

    // GIVES CURRENT LEVEL BASED ON DB VALUES, and POSSIBLY LATE GAME LEVELS if user is over 100
    getCurrentLevel: function () {
      const exponent = LEVEL_CURVE;
      const baseXP = XP_BASE_LEVEL;

      const overallLevel = Math.floor(Math.pow(tXP / baseXP, 1 / exponent) + 1);
      let currentLevel = overallLevel;
      let albedoLevel = 0;
      if (overallLevel > MAX_LEVEL) {
        albedoLevel = overallLevel - MAX_LEVEL;
        currentLevel = MAX_LEVEL;
      }

      const levelObj = {
        level: currentLevel,
        total: currentLevel + albedoLevel,
      };
      if (albedoLevel > 0) {
        levelObj.albedo = albedoLevel;
      }

      return levelObj;
    },

    // RETURNS THE TOTALXP, ACTIVITYXP, AND BATTLEXP OF AVATAR, from DB VALUES
    getXP: function () {
      return { aXP, bXP, tXP };
    },

    // Calculate whether a user leveled up, and how many times. Uses existing tXP calculated from the DB
    // as well as the xp gained from either new activites or a battle.
    checkLevelUp: function (xpGained = 0) {
      //console.log('TXP at check - ', tXP, 'plus gain - ', tXP + xpGained);
      const { total: startingLevel } = xpReturn.getCurrentLevel();
      let { total: endingLevel } = xpReturn.currentLevelByInput(tXP + xpGained);
      //console.log('SL - ', startingLevel, 'EL - ', endingLevel);
      const levelsGained = endingLevel - startingLevel;
      const leveledUp = levelsGained > 0;
      const qpEarned = levelsGained * QP_PER_LEVEL;
      const maxHealthEarned = levelsGained * MAX_HEALTH_PER_LEVEL;
      const powerEarned = levelsGained * POWER_PER_LEVEL;

      //console.log('XPSTUFF - ', xpGained, startingLevel, endingLevel, levelsGained, leveledUp, qpEarned);
      return {
        leveledUp,
        levels: levelsGained,
        endingLevel,
        qpEarned,
        maxHealthEarned,
        powerEarned,
        startingLevel,
      };
    },

    // GIVEN NEW XP FROM ACTIVITIES OR BATTLES, CALCULATE NEW TOTAL XPs
    calcNewXp: function (aXPGained = 0, bXPGained = 0) {
      const newAXP = aXP + aXPGained;
      const newBXP = bXP + bXPGained;
      const newTXP = newAXP + newBXP;

      return { aXP: newAXP, bXP: newBXP, tXP: newTXP };
    },

    // Calculate aXP from existing User Totals - The only function used to update activity XP
    calcNewActivityXPFromUt: function (userTotals) {
      // Standard = all activities except the activities that earn 50% bonus (running, crossFit, stairStepper, swimming, elliptical)
      let standardDuration = 0;
      let timeAndHalfDuration = 0;
      for (const activity in userTotals) {
        if (userTotals[activity]) {
          // Check if the activity is an intense activity, if so give user 50% more xp
          if (TIME_AND_HALF_ACTIVITIES.includes(activity)) {
            timeAndHalfDuration += userTotals[activity].duration;
            // Otherwise, just give thestandard 1xp for 1 minute
          } else {
            standardDuration += userTotals[activity].duration;
          }
        }
      }
      // Seconds
      const standardSeconds = standardDuration;
      const timeAndHalfEffortSeconds = timeAndHalfDuration;

      // Convert to minutes
      const standardEffortMinutes = standardSeconds / 60;
      const timeAndHalfEffortMinutes = timeAndHalfEffortSeconds / 60;

      const timeAndHalfAdjusted = timeAndHalfEffortMinutes * 1.5;

      // Add both the standard effort minutes and the adjusted minutes for intense exercises to get the total new activityXP
      const newActivityXP = standardEffortMinutes + timeAndHalfAdjusted;

      return Math.floor(newActivityXP);
    },

    // DETERMINE HOW MUCH HEALTH IS RECOVERED PER HOUR
    determineRecoveryPerHour: function (recovery) {
      const recoveryRetarder =
        recovery / (recovery + RECOVERY_EFFECTIVENESS_MOD);
      const adjRegenRate = recovery - Math.round(recovery * recoveryRetarder);
      return adjRegenRate;
    },

    // GIVES XP REQUIRED FOR NEXT LEVEL, based on level input
    nextLevelByInput: function (level) {
      const exponent = LEVEL_CURVE;
      const baseXP = XP_BASE_LEVEL;

      return Math.floor(baseXP * Math.pow(level, exponent)) + 1;
    },

    // GIVES CURRENT LEVEL based on XP input, and POSSIBLY LATE GAME LEVELS if user is over 100
    currentLevelByInput: function (xp) {
      const exponent = LEVEL_CURVE;
      const baseXP = XP_BASE_LEVEL;

      // Need to add 1 because I'm starting on level one rather than zero
      const overallLevel = Math.floor(Math.pow(xp / baseXP, 1 / exponent) + 1);
      let currentLevel = overallLevel;
      let albedoLevel = 0;
      if (overallLevel > MAX_LEVEL) {
        albedoLevel = overallLevel - MAX_LEVEL;
        currentLevel = MAX_LEVEL;
      }

      const levelObj = {
        level: currentLevel,
        total: currentLevel + albedoLevel,
      };
      if (albedoLevel > 0) {
        levelObj.albedo = albedoLevel;
      }

      return levelObj;
    },

    // Calculate whether a user leveled up, and how many times based on XP input
    checkLevelUpByInput: function (startingXP, endingXP) {
      const startingLevel = xpReturn.currentLevelByInput(startingXP).total;
      const endingLevel = xpReturn.currentLevelByInput(endingXP).total;
      const levelsGained = endingLevel - startingLevel;
      const leveledUp = levelsGained > 0;

      return { leveledUp, levels: levelsGained };
    },
  });
}

module.exports = xpCalc;
