const postBattleEffects = require('./postBattleEffects');
const determineItemsToInsert = require('./determineItemsToInsert');
const xpCalc = require('../upgrades/xpCalc');
const { OUTCOME_XP } = require('../CONSTANTS'); 

const postBattleProcess = function (avatar, foe, outcomeData, aHealthRemaining){
  // set status and health from battle. Post battle effects may still change this before saving
  let a = Object.assign({}, avatar, { goToBattle : false, status : outcomeData.avatarStatus, health : aHealthRemaining < 0 ? 0 : aHealthRemaining });

  let f = Object.assign({}, foe);
  let o = outcomeData.outcome;
  let xpGain = 0; 
  let ptGain = 0; 

  return {
    doPostBattleEffects : (effects) => {
      // assign 'a' variable above the value of avatar, same with 'o'
      ({ avatar : a, outcomeStatus : o } = postBattleEffects(a,f,o, effects));
    },
    updateAvatarByOutcome : () => {
      switch(o){
        case "Avatar Wins":
          xpGain = f.xpBounty; 
          ptGain = f.ptBounty; 
          a.battleWins = a.battleWins + 1;
          a.battleXP += xpGain;
          a.photonTokens += ptGain;
          break;
        case "Foe Wins":
          xpGain = f.xpBounty * OUTCOME_XP.lossMultiplier;
          a.battleLosses = a.battleLosses + 1;
          a.battleXP += xpGain;
          break;
        case "Draw":
          xpGain = f.xpBounty * OUTCOME_XP.drawMultiplier;
          a.battleDraws = a.battleDraws + 1; 
          a.battleXP += xpGain;
          break;
        case "Double KO":
          xpGain = f.xpBounty * OUTCOME_XP.dkoMultiplier;
          a.battleDkos = a.battleDkos + 1;
          a.battleXP += xpGain;
          break;
        default:
      }
    },
    updateAvatarByLevelUp : () => {
      // Use initial avatar values
      const { checkLevelUp } = xpCalc(avatar.activityXP, avatar.battleXP);
      // Check if level up from xp gain, adjust qp
      const leveledUpResults = checkLevelUp(xpGain);
      leveledUp = leveledUpResults.leveledUp;
      a = Object.assign({}, a, { qp : avatar.qp + leveledUpResults.qpEarned });
    },
    doAllPbas : (postBattleActions) => {
      //console.log('Running these PBAs - ', postBattleActions, 'for Avatar -', a.id, 'BO - ', o);
      return determineItemsToInsert(a.id, postBattleActions, o);
    },
    getPostBattlePackage : () => {
      // Outcome status may have changed due to post battle effects, so combine with default outcome object
      const fullOutcome = Object.assign({}, outcomeData, { outcome : o });
      return { postAv : a, postOutcome : fullOutcome, xpGain, ptGain };
    }
  }
}

module.exports = postBattleProcess;