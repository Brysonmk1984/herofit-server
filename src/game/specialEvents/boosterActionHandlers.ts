import { SpecialEventActionType } from "../../types/BackendOnlyTypes";

function handleBoostXP(xpBoosterAts: SpecialEventActionType[], xpBounty: number) {
  let boostedXpBounty = xpBounty;
  // For each 'foeBonusToStatsAts' action type
  for (let i = 0; i < xpBoosterAts.length; i++) {
    const at = xpBoosterAts[i];
    boostedXpBounty += boostedXpBounty * at.bonusPercent;
  }

  return Math.floor(boostedXpBounty);
}

function handleBoostPT(ptBoosterAts: SpecialEventActionType[], ptBounty: number) {
  let boostedPtBounty = ptBounty;
  // For each 'foeBonusToStatsAts' action type
  for (let i = 0; i < ptBoosterAts.length; i++) {
    const at = ptBoosterAts[i];
    boostedPtBounty += boostedPtBounty * at.bonusPercent;
  }
  return Math.floor(boostedPtBounty);
}

export { handleBoostXP, handleBoostPT };
