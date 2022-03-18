import Chance from "chance";
import { AvatarOrFoeString, BattleElementalProcs, BattleElements, BattleFoe, BattleHero, BattleOutcome, BattleRound, BattlePassiveAbility, OutcomeData } from "../../types/BackendOnlyTypes";
import HF from "../../types/herofit";
import { ARMOR_DRF, DAMAGE_VARIANCE_RANGE, ELM_DAMAGE_VARIANCE_RANGE } from "../CONSTANTS";
import { determineFireCrit, determineAirEvade, determineWaterHeal, determineEarthThorns, determineTD } from "./elementalProcs";
const chance = Chance();

type HeroOrFoe = BattleHero | BattleFoe;

interface DamageReductionObj extends BattleElements {
  total: number;
}

interface GrandTotals {
  aElmDamage: DamageReductionObj;
  fElmReduction: DamageReductionObj;
  fElmDamage: DamageReductionObj;
  aElmReduction: DamageReductionObj;
  aPhyDamage: number;
  fPhyReduction: number;
  fPhyDamage: number;
  aPhyReduction: number;
  avHealthRemaining: number;
  foeHealthRemaining: number;
}

// Calculates damage done against same element (F on F)
function _calcElmStraightDamage(aDamage: number) {
  return aDamage;
}

// Calculates damage done against an element's weaker counterpart element (F on W&A)
function _calcElmDamageBonus(aDamage: number) {
  // Straight 50% damage increase
  let d = aDamage * 1.5;
  return d;
}

// Calculates damage done against an element's counter element (F on E)
function _calcCounterElmDR(aDamage: number, rResistance: number) {
  // Straight 25% damage reduction
  let d = aDamage * 0.75;
  let r = rResistance;
  if (r === 0) {
    return d;
  }
  // Further reduced damage based on amount of resistance
  const dr = (r * 10) / (r * 10 + 9 * d);
  return d - d * dr;
}

// Calculate the total element damage, reducing damage done to each individual elm by it's mirror's resistance vale (F on F)
function _calcTurnMirrorReduction(aDamage: number, rResistance: number) {
  let d = aDamage;
  let r = rResistance;

  const dr = (r * 5) / (r * 5 + 9 * d);
  return { reduction: d * dr, netDamage: d - d * dr };
}

function _determineElmMatchups(elm: Lowercase<HF.PrimaryElement>) {
  const mirror = [elm];
  let weakVs: Lowercase<HF.PrimaryElement>[] = [];
  let strongVs: Lowercase<HF.PrimaryElement>[] = [];

  switch (elm) {
    case "fire":
      weakVs = ["earth"];
      strongVs = ["air", "water"];
      break;

    case "earth":
      weakVs = ["water"];
      strongVs = ["air", "fire"];
      break;

    case "water":
      weakVs = ["air"];
      strongVs = ["earth", "fire"];
      break;

    case "air":
      weakVs = ["fire"];
      strongVs = ["earth", "water"];
      break;

    default:
  }

  return { mirror, weakVs, strongVs };
}

function _calcElementDamage(attacker: BattleHero | BattleFoe, receiver: BattleHero | BattleFoe, evaded: boolean) {
  // Using Ceil to benefit lower level players not having a single damage in elements
  const attackerElms: BattleElements = {
    fire: Math.ceil(
      chance.floating({
        min: attacker.fire * ELM_DAMAGE_VARIANCE_RANGE[0],
        max: attacker.fire * ELM_DAMAGE_VARIANCE_RANGE[1],
        fixed: 2,
      }),
    ),
    earth: Math.ceil(
      chance.floating({
        min: attacker.earth * ELM_DAMAGE_VARIANCE_RANGE[0],
        max: attacker.earth * ELM_DAMAGE_VARIANCE_RANGE[1],
        fixed: 2,
      }),
    ),
    water: Math.ceil(
      chance.floating({
        min: attacker.water * ELM_DAMAGE_VARIANCE_RANGE[0],
        max: attacker.water * ELM_DAMAGE_VARIANCE_RANGE[1],
        fixed: 2,
      }),
    ),
    air: Math.ceil(
      chance.floating({
        min: attacker.air * ELM_DAMAGE_VARIANCE_RANGE[0],
        max: attacker.air * ELM_DAMAGE_VARIANCE_RANGE[1],
        fixed: 2,
      }),
    ),
  };
  const receiverElms = {
    fire: Math.ceil(
      chance.floating({
        min: receiver.fire * ELM_DAMAGE_VARIANCE_RANGE[0],
        max: receiver.fire * ELM_DAMAGE_VARIANCE_RANGE[1],
        fixed: 2,
      }),
    ),
    earth: Math.ceil(
      chance.floating({
        min: receiver.earth * ELM_DAMAGE_VARIANCE_RANGE[0],
        max: receiver.earth * ELM_DAMAGE_VARIANCE_RANGE[1],
        fixed: 2,
      }),
    ),
    water: Math.ceil(
      chance.floating({
        min: receiver.water * ELM_DAMAGE_VARIANCE_RANGE[0],
        max: receiver.water * ELM_DAMAGE_VARIANCE_RANGE[1],
        fixed: 2,
      }),
    ),
    air: Math.ceil(
      chance.floating({
        min: receiver.air * ELM_DAMAGE_VARIANCE_RANGE[0],
        max: receiver.air * ELM_DAMAGE_VARIANCE_RANGE[1],
        fixed: 2,
      }),
    ),
  };
  // console.log('AE = ', attackerElms);
  // console.log('RE = ', receiverElms);

  let turnElmDamageDone: DamageReductionObj = {
    fire: 0,
    earth: 0,
    water: 0,
    air: 0,
    total: 0,
  };

  let turnElmDamagePrevented: DamageReductionObj = {
    fire: 0,
    earth: 0,
    water: 0,
    air: 0,
    total: 0,
  };

  // EACH ELEMENT GETS CALCULATED AGAINST EACH FOE ELEMENT INDIVIDUALLY
  for (const elm in attackerElms) {
    const battleElmProperty = elm as keyof BattleElements;
    const elmDamageDone: BattleElements = {
      fire: 0,
      earth: 0,
      water: 0,
      air: 0,
    };

    if (attackerElms[battleElmProperty] > 0) {
      //console.log(`${elm.toUpperCase()}: ${attackerElms[elm]}`);
      const { mirror, weakVs, strongVs } = _determineElmMatchups(elm);
      //console.log('mirror - ', mirror, 'wv - ', weakVs, 'sv - ', strongVs);

      // Mirror match elm damage
      mirror.forEach(mirrorMatchup => {
        elmDamageDone[mirrorMatchup] += _calcElmStraightDamage(attackerElms[battleElmProperty]);
      });

      // WeakVs elements Damage
      weakVs.forEach(weakMatchup => {
        elmDamageDone[weakMatchup] += _calcCounterElmDR(attackerElms[battleElmProperty], receiverElms[weakMatchup]);
      });

      // StrongVs elements Damage
      strongVs.forEach(strongMatchup => {
        elmDamageDone[strongMatchup] += _calcElmDamageBonus(attackerElms[battleElmProperty]);
      });

      // turn damage reduction from mirror elm; reduces damage to all elm matchups
      let sumElmDamageToEachElm = 0;
      let elmCount = 0;
      for (let e in elmDamageDone) {
        //console.log(`D to ${e}`,elmDamageDone[e]);
        if (elmDamageDone[e as keyof BattleElements] > 0) {
          sumElmDamageToEachElm += elmDamageDone[e as keyof BattleElements];
          elmCount += 1;
        }
      }

      // Take the average of the damage this particular attacking elm did to the enemies elms
      // then reduce the total value by the Damage Reduction Formula, considering the foes resistance (mirror elm)
      const average = sumElmDamageToEachElm / elmCount;
      //console.log('AVERAGE - ', average);
      const { reduction, netDamage } = _calcTurnMirrorReduction(average, receiverElms[mirror[0]]);
      turnElmDamageDone[elm as keyof DamageReductionObj] = Math.floor(netDamage);
      turnElmDamageDone.total += Math.floor(netDamage);
      turnElmDamagePrevented[elm as keyof DamageReductionObj] = Math.floor(reduction);
      turnElmDamagePrevented.total += Math.floor(reduction);
    }
  }

  /* 
    THIS IS WHERE WE NEED TO INSERT ELEMENTAL SPECIALTIES
  */
  // First value is total fire of attacker, second is the 'd' factor, which is all elemental power added together adjusted down for rounds, and then averaged together in the fireProc function
  const fireProc = determineFireCrit(attacker.fire, attackerElms.fire + (attackerElms.earth || attackerElms.fire) + (attackerElms.water || attackerElms.fire) + (attackerElms.air || attackerElms.fire));
  turnElmDamageDone.fire += fireProc.critDamage;
  turnElmDamageDone.total += fireProc.critDamage;

  //   return { critChance, critDamage };

  //console.log(airProc);
  if (evaded) {
    turnElmDamageDone = { fire: 0, earth: 0, water: 0, air: 0, total: 0 };
    turnElmDamagePrevented = { fire: 0, earth: 0, water: 0, air: 0, total: 0 };
  }

  //console.log('ENDING ATTACKER ELM DAMAGE :', turnElmDamageDone, turnElmDamagePrevented);
  return {
    turnElmDamageDone: turnElmDamageDone,
    turnElmDamagePrevented: turnElmDamagePrevented,
    fireProc,
  };
}

// Calculates damage done against an element's counter element (F on E)
function _calcArmorDR(aPower: number, rArmor: number, battleAbility?: BattlePassiveAbility) {
  const armorType = battleAbility?.name.includes("Corundum") ? battleAbility.name : "default";
  let armorDRF = ARMOR_DRF[armorType as keyof typeof ARMOR_DRF];
  let d = aPower;
  let r = rArmor;
  if (r === 0) {
    return { reduction: r, netDamage: d };
  }

  // Reduced damage based on amount of resistance
  const dr = (r * 10) / (r * 10 + armorDRF * d);
  return {
    reduction: parseFloat((d * dr).toFixed(2)),
    netDamage: Math.floor(d - d * dr),
  };
}

function _calcDamage(aPower: number, rArmor: number, evaded: boolean, battleAbility?: BattlePassiveAbility) {
  if (evaded) {
    return { physicalDamage: 0, physicalReduction: 0 };
  }
  const lowEnd = aPower * DAMAGE_VARIANCE_RANGE[0];
  const highEnd = aPower * DAMAGE_VARIANCE_RANGE[1];

  const power = chance.floating({ min: lowEnd, max: highEnd, fixed: 2 });

  const lowEndArmor = rArmor * DAMAGE_VARIANCE_RANGE[0];
  const highEndArmor = rArmor * DAMAGE_VARIANCE_RANGE[1];

  const armor = chance.floating({
    min: lowEndArmor,
    max: highEndArmor,
    fixed: 2,
  });

  const { reduction, netDamage } = _calcArmorDR(power, armor, battleAbility);

  return {
    physicalDamage: Math.floor(netDamage),
    physicalReduction: Math.floor(reduction),
  };
}

function _determineOutcome(winner: BattleOutcome): OutcomeData {
  if (winner === "Avatar") {
    return {
      outcome: "Avatar Wins",
      avatarStatus: "Recovering",
      foeStatus: "Knocked Out",
    };
  } else if (winner === "Foe") {
    return {
      outcome: "Foe Wins",
      avatarStatus: "Knocked Out",
      foeStatus: "Recovering",
    };
  } else if (winner === "DKO") {
    return {
      outcome: "Double KO",
      avatarStatus: "Knocked Out",
      foeStatus: "Knocked Out",
    };
  } else {
    return {
      outcome: "Draw",
      avatarStatus: "Recovering",
      foeStatus: "Recovering",
    };
  }
}

function _checkIfElemental({ fire, water, earth, air }: BattleElements) {
  const contenderElms: BattleElements = { fire, water, earth, air };
  let hasElementalPower = false;
  for (let elm in contenderElms) {
    if (contenderElms[elm as keyof BattleElements] !== 0) {
      hasElementalPower = true;
    }
  }
  // If hasElementalPower is true, the contender is elemental, so return true
  return hasElementalPower ? true : false;
}

function _calcHealthLoss(health: number, damage: number, bonusDamage = 0) {
  return Math.floor(health - damage - bonusDamage);
}

function _computeHeroRound(aggressor: BattleHero, defender: BattleFoe, totals: GrandTotals, battleAbility: BattlePassiveAbility) {
  // Now determining evasion here to prevent physical damage
  const airProc = determineAirEvade(defender.air);

  // Calc physical damage, get back damage done and how much was prevented
  const { physicalDamage, physicalReduction } = _calcDamage(aggressor.power, defender.armor, airProc.evaded, battleAbility);
  // Calc elm damage, get back damage done and how much was prevented
  const { turnElmDamageDone, turnElmDamagePrevented, fireProc } = _calcElementDamage(aggressor, defender, airProc.evaded);

  // Add to totals done for damage and reduction
  totals.aPhyDamage += physicalDamage;
  totals.fPhyReduction += physicalReduction;
  // Add to totals done for damage and reduction
  for (let elm in totals.aElmDamage) {
    totals.aElmDamage[elm as keyof DamageReductionObj] += turnElmDamageDone[elm as keyof DamageReductionObj];
  }
  for (let elm in totals.fElmReduction) {
    totals.fElmReduction[elm as keyof DamageReductionObj] += turnElmDamagePrevented[elm as keyof DamageReductionObj];
  }

  const elementalProcs = {
    fire: fireProc,
    air: airProc,
    earth: determineEarthThorns(defender.earth, turnElmDamageDone.total + totals.aPhyDamage),
    water: determineWaterHeal(aggressor.water, turnElmDamageDone.total + totals.aPhyDamage),
  };

  // Only adjust Health for Thorns & VampTouch IF evasion did not happen
  if (!airProc.evaded) {
    // EARTH - Deal damage back to attacker based on earthProc
    totals.avHealthRemaining -= elementalProcs.earth.thornsDamageToAttacker;
    // WATER - Heal based on waterProc
    totals.avHealthRemaining += elementalProcs.water.amountHealed;
  }
  // Adjust for hero DOT passive (Compost Creature)
  const bonusDamage = battleAbility?.name === "Olfactory Overload" ? Math.floor(physicalDamage * 0.1) : 0;
  totals.foeHealthRemaining = _calcHealthLoss(totals.foeHealthRemaining, turnElmDamageDone.total + physicalDamage, bonusDamage);

  return {
    defenderHealthLeft: totals.foeHealthRemaining,
    aggressorHealthLeft: totals.avHealthRemaining,
    physicalDamageDealt: physicalDamage,
    elementalDamageDealt: turnElmDamageDone,
    physicalReduction,
    elementalReduction: turnElmDamagePrevented,
    totals,
    elementalProcs,
  };
}

function _computeFoeRound(aggressor: BattleFoe, defender: BattleHero, foeIsElemental: boolean, totals: GrandTotals, battleAbility?: BattlePassiveAbility) {
  // Now determining evasion here to prevent physical damage
  const airProc = determineAirEvade(defender.air);

  let physicalDamage,
    physicalReduction,
    turnElmDamageDone = { total: 0 } as DamageReductionObj,
    turnElmDamagePrevented = { total: 0 } as DamageReductionObj;

  let elementalProcs: BattleElementalProcs = {
    fire: null,
    water: null,
    air: null,
    earth: null,
  };

  // If foe has no elemental power, calc physical damage twice instead of physical + elemental
  if (!foeIsElemental) {
    // Calc physical damage, get back damage done and how much was prevented
    const damageAndReduction1 = _calcDamage(aggressor.power, defender.armor, airProc.evaded, battleAbility);
    const damageAndReduction2 = _calcDamage(aggressor.power, defender.armor, airProc.evaded, battleAbility);
    physicalDamage = damageAndReduction1.physicalDamage + damageAndReduction2.physicalDamage;
    physicalReduction = damageAndReduction1.physicalReduction + damageAndReduction2.physicalReduction;

    // Add to totals done for damage and reduction
    totals.fPhyDamage += physicalDamage;
    totals.aPhyReduction += physicalReduction;

    // FIRE and WATER deal with attacks, so a non elemental foe wont use these
    // AIR and EARTH deal with defender's stats,  so they are included here because foe is not defender here
    elementalProcs.air = airProc;
    elementalProcs.earth = determineEarthThorns(defender.earth, physicalDamage);

    // Only adjust Health for Thorns & VampTouch IF evasion did not happen
    if (!airProc.evaded) {
      // EARTH - Deal damage back to attacker based on earthProc
      totals.foeHealthRemaining -= elementalProcs.earth.thornsDamageToAttacker;
    }

    totals.avHealthRemaining = _calcHealthLoss(totals.avHealthRemaining, turnElmDamageDone.total + physicalDamage);

    // Adjust for hero DOT passive (Compost Creature)
    if (battleAbility?.name === "Olfactory Overload") {
      const bonusDamage = Math.floor(physicalDamage * 0.1);
      totals.foeHealthRemaining -= bonusDamage;
    }

    return {
      defenderHealthLeft: totals.avHealthRemaining,
      aggressorHealthLeft: totals.foeHealthRemaining,
      physicalDamageDealt: physicalDamage,
      elementalDamageDealt: turnElmDamageDone,
      physicalReduction,
      elementalReduction: turnElmDamagePrevented,
      totals,
      elementalProcs,
    };
  } else {
    // Calc physical damage, get back damage done and how much was prevented
    const damageAndReduction1 = _calcDamage(aggressor.power, defender.armor, airProc.evaded, battleAbility);
    physicalDamage = damageAndReduction1.physicalDamage;
    physicalReduction = damageAndReduction1.physicalReduction;
    // Calc elm damage, get back damage done and how much was prevented
    const { turnElmDamageDone, turnElmDamagePrevented, fireProc } = _calcElementDamage(aggressor, defender, airProc.evaded);
    //console.log('FOE ELM DAMAGE THIS ROUND = ', turnElmDamageDone, 'was evaded? ', airProc.evaded);
    // Add to totals done for damage and reduction
    totals.fPhyDamage += physicalDamage;
    totals.aPhyReduction += physicalReduction;

    // Add to totals done for damage and reduction
    for (let elm in totals.fElmDamage) {
      totals.fElmDamage[elm as keyof DamageReductionObj] += turnElmDamageDone[elm as keyof DamageReductionObj];
    }
    for (let elm in totals.aElmReduction) {
      totals.aElmReduction[elm as keyof DamageReductionObj] += turnElmDamagePrevented[elm as keyof DamageReductionObj];
    }

    elementalProcs = {
      fire: fireProc,
      air: airProc,
      earth: determineEarthThorns(defender.earth, turnElmDamageDone.total + physicalDamage),
      water: determineWaterHeal(aggressor.water, turnElmDamageDone.total + physicalDamage),
    };

    // Only adjust Health for Thorns & VampTouch IF evasion did not happen
    if (!airProc.evaded) {
      // EARTH - Deal damage back to attacker based on earthProc
      totals.foeHealthRemaining -= elementalProcs.earth.thornsDamageToAttacker;
      // WATER - Heal based on waterProc
      totals.foeHealthRemaining += elementalProcs.water.amountHealed;
    }

    totals.avHealthRemaining = _calcHealthLoss(totals.avHealthRemaining, turnElmDamageDone.total + physicalDamage);

    // Adjust for hero DOT passive (Compost Creature)
    if (battleAbility?.name === "Olfactory Overload") {
      const bonusDamage = Math.floor(physicalDamage * 0.1);
      //console.log("BONUS DAMAGE", bonusDamage);
      totals.foeHealthRemaining -= bonusDamage;
    }

    return {
      defenderHealthLeft: totals.avHealthRemaining,
      aggressorHealthLeft: totals.foeHealthRemaining,
      physicalDamageDealt: physicalDamage,
      elementalDamageDealt: turnElmDamageDone,
      physicalReduction,
      elementalReduction: turnElmDamagePrevented,
      totals,
      elementalProcs,
    };
  }
}

function _computeBattleTurn(aggressor: HeroOrFoe, defender: HeroOrFoe, foeIsElemental: boolean, totals: GrandTotals, battleAbility?: BattlePassiveAbility) {
  // IF HERO ROUND
  if ("character" in aggressor) {
    return _computeHeroRound(aggressor, defender as BattleFoe, totals, battleAbility);
    // IF FOE ROUND
  } else {
    return _computeFoeRound(aggressor, defender as BattleHero, foeIsElemental, totals, battleAbility);
  }
}

function _determineAggressorDefender(turnIsOdd: boolean, avatar: BattleHero, foe: BattleFoe, goesFirst: AvatarOrFoeString, tdRound: boolean) {
  // Temporal Distortion round is a bonus round for the Avatar based on Aether value
  if (tdRound) {
    return {
      aggressorString: "Avatar" as const,
      aggressor: avatar,
      defenderString: "Foe" as const,
      defender: foe,
      goesFirst: "Avatar" as const,
    };
  }

  const goesSecond = goesFirst === "Avatar" ? "Foe" : "Avatar";
  // If the turn is odd, the second player attacks, otherwise it's the first player
  const aggressorString = turnIsOdd ? goesSecond : goesFirst;
  let aggressor = aggressorString === "Avatar" ? avatar : foe;
  // If the turn is odd, the first player attacks, otherwise it's the second player
  const defenderString = turnIsOdd ? goesFirst : goesSecond;
  let defender = defenderString === "Avatar" ? avatar : foe;

  return { aggressorString, aggressor, defenderString, defender };
}

// Temporal Distortion has a chance to repeat rounds by Avatar
function _testForTemporalDistortion(aggressorString: AvatarOrFoeString, aether: number, nextRoundIsTD: boolean, goesFirst: AvatarOrFoeString) {
  // Round must be avatar as aggressor, av must have aether, and round must not already be an TD round
  if (aggressorString === "Avatar" && aether && !nextRoundIsTD) {
    return determineTD(aether, goesFirst);
  }
  return { td: false, gf: goesFirst };
}

function doBattle(avatar: BattleHero, foe: BattleFoe, goesFirst: "Avatar" | "Foe", battleAbility?: BattlePassiveAbility) {
  //console.log("AV IN BATTLE=", avatar.name, "GF=", goesFirst);
  //goesFirst = 'avatar';
  const battleTurns = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  //console.log("1pa", battleAbility);
  const foeIsElemental = _checkIfElemental(foe);
  const roundBreakdown: BattleRound[] = [];

  var grandTotals = {
    aElmDamage: { fire: 0, earth: 0, air: 0, water: 0, total: 0 },
    fElmReduction: { fire: 0, earth: 0, air: 0, water: 0, total: 0 },
    fElmDamage: { fire: 0, earth: 0, air: 0, water: 0, total: 0 },
    aElmReduction: { fire: 0, earth: 0, air: 0, water: 0, total: 0 },
    aPhyDamage: 0,
    fPhyReduction: 0,
    fPhyDamage: 0,
    aPhyReduction: 0,
    avHealthRemaining: avatar.health,
    foeHealthRemaining: foe.health,
  };
  let winnerString: BattleOutcome = null;
  let i;
  let nextRoundIsTD = false;
  let winner,
    loser = null;
  for (i = 0; i < battleTurns.length; i++) {
    if (winnerString) {
      break;
    }

    // because zero-based, if the turn is odd, goesFirst actually doesn't attack, but the other player
    const turnIsOdd = battleTurns[i] % 2 === 0 ? false : true;
    const { aggressorString, aggressor, defenderString, defender } = _determineAggressorDefender(turnIsOdd, avatar, foe, goesFirst, nextRoundIsTD);

    // LATE GAME ELEMENTAL TRAIT - Determine if IDS round, if so, set variable to flag it for next round and change whoGoes first in order to reverse the turn order
    ({ td: nextRoundIsTD, gf: goesFirst } = _testForTemporalDistortion(aggressorString, avatar.aether, nextRoundIsTD, goesFirst));

    // Compute battle turn and add results to total
    const { defenderHealthLeft, aggressorHealthLeft, physicalDamageDealt, elementalDamageDealt, physicalReduction, elementalReduction, totals, elementalProcs } = _computeBattleTurn(aggressor, defender, foeIsElemental, grandTotals, battleAbility);

    grandTotals = totals;
    roundBreakdown.push({
      turn: i,
      aggressor: aggressorString,
      defender: defenderString,
      physicalDamageDealt,
      elementalDamageDealt,
      physicalReduction,
      elementalReduction,
      defenderHealthLeft,
      aggressorHealthLeft,
      elementalProcs,
    });
    //console.log('RB',roundBreakdown);
    const aHealth = grandTotals.avHealthRemaining;
    const fHealth = grandTotals.foeHealthRemaining;
    //console.log('GT-', grandTotals);
    if (aHealth <= 0 && fHealth <= 0) {
      // RARE - If thorns damage caused both Hero & Foe to drop below zero, DKO
      winnerString = "DKO";
    } else if (aHealth <= 0 || fHealth <= 0) {
      const avatarHasMoreHealth = aHealth > fHealth;
      const foeHasMoreHealth = fHealth > aHealth;
      if (avatarHasMoreHealth) {
        if (aggressorString === "Avatar") {
          // Foe died of regular combat damage from avatar
          winnerString = aggressorString;
          winner = aggressor;
          loser = defender;
        } else {
          // Avatar died of foe thorns damage
          winnerString = defenderString;
          winner = defender;
          loser = aggressor;
        }
      } else if (foeHasMoreHealth) {
        if (aggressorString === "Foe") {
          // Avatar died of regular combat damage from foe
          winnerString = aggressorString;
          winner = aggressor;
          loser = defender;
        } else {
          // Foe died of avatar thorns damage
          winnerString = defenderString;
          winner = defender;
          loser = aggressor;
        }
      }
    } else if (battleTurns[i] === 11) {
      winnerString = "Draw";
    }
  }

  // console.log('Battle round results = ', roundBreakdown.map((r) =>{
  //   return { r, ...r.elementalProcs }
  // }));

  const outcomeData = _determineOutcome(winnerString);
  // console.log('RB=', roundBreakdown, outcomeData);
  // console.log("FOE HEALTH REMAINING", grandTotals.foeHealthRemaining);

  interface BattleResults {
    aHealthRemaining: number;
    fHealthRemaining: number;
    outcomeData: OutcomeData;
    roundBreakdown: HF.BattleRound[];
  }

  const results: BattleResults = {
    aHealthRemaining: grandTotals.avHealthRemaining,
    fHealthRemaining: grandTotals.foeHealthRemaining,
    outcomeData,
    roundBreakdown,
  };

  //console.log('RESSS-', results);
  return results;
}

export default doBattle;

export function unitTestExporter() {
  return {
    _calcArmorDR,
  };
}
