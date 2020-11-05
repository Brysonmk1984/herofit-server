const { LEVEL_CURVE, XP_BASE_LEVEL, QP_PER_LEVEL } = require('../constants.js');
//let LEVEL_CURVE = 1.2;
//let XP_BASE_LEVEL = 99;
//let QP_PER_LEVEL = 5;

// PRIMARY FUNCTIONS FOR HANDLING EXPERIENCE POINTS AND LEVEL UPS
function xpCalc(activityXP, battleXP){
  const aXP = activityXP,
  bXP = battleXP,
  tXP = aXP + bXP;

  return xpReturn = {

    // GIVES XP REQUIRED FOR NEXT LEVEL BASED ON DB VALUES
    getNextLevel : function (levelsAway = 0){
      const exponent = LEVEL_CURVE;
      const baseXP = XP_BASE_LEVEL;
      const currentLevel = xpReturn.getCurrentLevel()
      return Math.floor(baseXP * (Math.pow(currentLevel + levelsAway, exponent))) + 1;
    },

    // GIVES CURRENT LEVEL BASED ON DB VALUES
    getCurrentLevel : function (){
      const exponent = LEVEL_CURVE;
      const baseXP = XP_BASE_LEVEL;
      const currentLevel = Math.pow((tXP/baseXP),(1 / exponent));
    
      return Math.floor(currentLevel) + 1;
    },

    // RETURNS THE TOTALXP, ACTIVITYXP, AND BATTLEXP OF AVATAR, from DB VALUES
    getXP : function(){
      return { aXP, bXP, tXP }
    },

    // Calculate whether a user leveled up, and how many times. Uses existing tXP calculated from the DB
    // as well as the xp gained from either new activites or a battle.
    checkLevelUp : function (xpGained = 0){
      //console.log('TXP at check - ', tXP, 'plus gain - ', tXP + xpGained);
      const startingLevel = xpReturn.getCurrentLevel();
      const endingLevel = xpReturn.currentLevelByInput(tXP + xpGained);
      //console.log('SL - ', startingLevel, 'EL - ', endingLevel);
      const levelsGained = (endingLevel - startingLevel);console.log(levelsGained);
      const leveledUp = levelsGained > 0;
      const qpEarned = (levelsGained * QP_PER_LEVEL);
      //console.log('XPSTUFF - ', xpGained, startingLevel, endingLevel, levelsGained, leveledUp, qpEarned);
      return { leveledUp, levels : levelsGained, endingLevel, qpEarned };
    },

    // GIVEN NEW XP FROM ACTIVITIES OR BATTLES, CALCULATE NEW TOTAL XPs
    calcNewXp : function (aXPGained = 0, bXPGained = 0){
      const newAXP = aXP + aXPGained;
      const newBXP = bXP + bXPGained;
      const newTXP = newAXP + newBXP;

      return { aXP : newAXP, bXP : newBXP, tXP : newTXP }
    },

    calcNewActivityXPFromUt : function(userTotals){

      let totalDuration = 0;
      for(const activity in userTotals){
        if(userTotals[activity]){
          totalDuration += userTotals[activity].duration;
        }
      }
      const effortSeconds = totalDuration;
      const effortMinutes = effortSeconds / 60;
  
      const newActivityXP = effortMinutes;
      return Math.floor(newActivityXP);
 
    },

    /**** 
     * 
     The Methods below are MOSTLY for testing purposes, but not always. 'checkLevelUpByInput' is used on avatars.js route. The upgrade algorithim uses only the functions above,
     which use the players XP directly from the DB as input, which is passed to 'xpCalc' directly as a parameter.
     * 
     ****/ 

    // GIVES XP REQUIRED FOR NEXT LEVEL, based on level input
    nextLevelByInput : function (level){
      const exponent = LEVEL_CURVE;
      const baseXP = XP_BASE_LEVEL;

      return Math.floor(baseXP * (Math.pow(level, exponent))) + 1;
    },

    // GIVES CURRENT LEVEL based on XP input
    currentLevelByInput : function (xp){
      const exponent = LEVEL_CURVE;
      const baseXP = XP_BASE_LEVEL;
      // Need to add 1 because I'm starting on level one rather than zero
      const currentLevel = Math.pow((xp/baseXP),(1 / exponent)) + 1;
    
      return Math.floor(currentLevel);
    },

    // Calculate whether a user leveled up, and how many times based on XP input
    checkLevelUpByInput : function (startingXP, endingXP){
      const level = xpReturn.currentLevelByInput(startingXP);
      const endingLevel = xpReturn.currentLevelByInput(endingXP);
      const levelsGained = (endingLevel - level);
      const leveledUp = levelsGained > 0;
    
      return { leveledUp, levels : levelsGained };
    },
  }
}

module.exports = xpCalc;