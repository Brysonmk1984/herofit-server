const postBattleEffects = require("./postBattleEffects");
const determineItemsToInsert = require("./determineItemsToInsert");
const preventDuplicateItems = require("../items/preventDuplicateItems");
const { OUTCOME_XP } = require("../CONSTANTS");

const postBattleProcess = function (avatar, foe, outcomeData, aHealthRemaining, fHealthRemaining) {
  // set status and health from battle. Post battle effects may still change this before saving
  let a = Object.assign({}, avatar, {
    goToBattle: false,
    status: outcomeData.avatarStatus,
    health: aHealthRemaining < 0 ? 0 : aHealthRemaining,
  });

  let f = Object.assign({}, foe, { health: fHealthRemaining });
  let o = outcomeData.outcome;
  let xpGain = 0;
  let ptGain = 0;
  let effectProcs;

  return {
    doPostBattleEffects: effects => {
      // assign 'a' variable above the value of avatar, same with 'o'
      ({ avatar: a, foe: f, outcomeStatus: o, effectProcs } = postBattleEffects(a, f, outcomeData, effects));
    },
    updateAvatarByOutcome: () => {
      switch (o) {
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
    doAllPbas: postBattleActions => {
      //console.log('Running these PBAs - ', postBattleActions, 'for Avatar -', a.id, 'BO - ', o);
      const items = determineItemsToInsert(postBattleActions, o);
      //console.log('ATTEMPTING DUP CHECK', items);
      // Prevents duplicate items being added to a players inventory for non-consumables
      return preventDuplicateItems(items, a.id);
    },
    getPostBattlePackage: () => {
      // Outcome status may have changed due to post battle effects, so combine with default outcome object
      const fullOutcome = Object.assign({}, outcomeData, { outcome: o });
      return {
        postAv: a,
        postOutcome: fullOutcome,
        xpGain,
        ptGain,
        postFoe: f,
        postEffectProcs: effectProcs,
      };
    },
  };
};

module.exports = postBattleProcess;
