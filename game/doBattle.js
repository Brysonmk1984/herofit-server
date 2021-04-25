const chance = require('chance')();
const { ARMOR_DRF, DAMAGE_VARIANCE_RANGE, ELM_DAMAGE_VARIANCE_RANGE } = require('./constants');
const { determineFireCrit, determineAirEvade, defermineWaterHeal, determineEarthThorns } = require('./elementalProcs');

// Calculates damage done against same element (F on F)
function _calcElmStraightDamage(aDamage){
  return aDamage;
}

// Calculates damage done against an element's weaker counterpart element (F on W&A)
function _calcElmDamageBonus(aDamage){
  // Straight 50% damage increase
  let d = aDamage * 1.5;
  return d;
}

// Calculates damage done against an element's counter element (F on E)
function _calcCounterElmDR(aDamage, rResistance){
  // Straight 25% damage reduction
  let d = aDamage * .75;
  let r = rResistance;
  if(r === 0){
    return d;
  }
  // Further reduced damage based on amount of resistance
  const dr = (r*10)/ ((r*10)+(9*d));
  return d - (d * dr);
}

// Calculate the total element damage, reducing damage done to each individual elm by it's mirror's resistance vale (F on F)
function _calcTurnMirrorReduction(aDamage, rResistance){
  let d = aDamage;
  let r = rResistance;

  const dr = (r*10)/((r*10)+(9*d));
  return { reduction : (d * dr), netDamage : (d - (d * dr)) };
}

function _determineElmMatchups(elm){
  const mirror = [elm];
  let weakVs = [];
  let strongVs = [];

  switch(elm){
    case 'fire':
      weakVs = ['earth'];
      strongVs = ['air', 'water'];
    break;

    case 'earth':
      weakVs = ['water'];
      strongVs = ['air', 'fire'];
    break;

    case 'water':
      weakVs = ['air'];
      strongVs = ['earth', 'fire'];
    break;

    case 'air':
      weakVs = ['fire'];
      strongVs = ['earth', 'water'];
    break;

    default:
  }

  return { mirror, weakVs, strongVs };
}


function _calcElementDamage(attacker, receiver){
  
  const attackerElms = {
    fire : Math.floor(chance.floating({ min: attacker.fire * ELM_DAMAGE_VARIANCE_RANGE[0], max: attacker.fire * ELM_DAMAGE_VARIANCE_RANGE[1], fixed: 2 })),
    earth : Math.floor(chance.floating({ min: attacker.earth * ELM_DAMAGE_VARIANCE_RANGE[0], max: attacker.earth * ELM_DAMAGE_VARIANCE_RANGE[1], fixed: 2 })),
    water : Math.floor(chance.floating({ min: attacker.water * ELM_DAMAGE_VARIANCE_RANGE[0], max: attacker.water * ELM_DAMAGE_VARIANCE_RANGE[1], fixed: 2 })),
    air : Math.floor(chance.floating({ min: attacker.air * ELM_DAMAGE_VARIANCE_RANGE[0], max: attacker.air * ELM_DAMAGE_VARIANCE_RANGE[1], fixed: 2 })),
  };
  const receiverElms = {
    fire : Math.floor(chance.floating({ min: receiver.fire * ELM_DAMAGE_VARIANCE_RANGE[0], max: receiver.fire * ELM_DAMAGE_VARIANCE_RANGE[1], fixed: 2 })),
    earth : Math.floor(chance.floating({ min: receiver.earth * ELM_DAMAGE_VARIANCE_RANGE[0], max: receiver.earth * ELM_DAMAGE_VARIANCE_RANGE[1], fixed: 2 })),
    water : Math.floor(chance.floating({ min: receiver.water * ELM_DAMAGE_VARIANCE_RANGE[0], max: receiver.water * ELM_DAMAGE_VARIANCE_RANGE[1], fixed: 2 })),
    air : Math.floor(chance.floating({ min: receiver.air * ELM_DAMAGE_VARIANCE_RANGE[0], max: receiver.air * ELM_DAMAGE_VARIANCE_RANGE[1], fixed: 2 })),
  };
  // console.log('AE = ', attackerElms);
  // console.log('RE = ', receiverElms);

  let turnElmDamageDone = {
    fire : 0,
    earth : 0,
    water : 0,
    air : 0,
    total : 0
  };

  const turnElmDamagePrevented = {
    fire : 0,
    earth : 0,
    water : 0,
    air : 0,
    total : 0
  }

  // EACH ELEMENT GETS CALCULATED AGAINST EACH FOE ELEMENT INDIVIDUALLY
  for (const elm in attackerElms) {
    const elmDamageDone = {
      fire : 0,
      earth : 0,
      water : 0,
      air : 0,
    }

    if(attackerElms[elm] > 0){
      //console.log(`${elm.toUpperCase()}: ${attackerElms[elm]}`);
      const { mirror, weakVs, strongVs } = _determineElmMatchups(elm);
      //console.log('mirror - ', mirror, 'wv - ', weakVs, 'sv - ', strongVs);

      // Mirror match elm damage
      mirror.forEach((mirrorMatchup) =>{
        elmDamageDone[mirrorMatchup] += _calcElmStraightDamage(attackerElms[elm]);
      });
      
      // WeakVs elements Damage
      weakVs.forEach((weakMatchup) =>{
        elmDamageDone[weakMatchup] += _calcCounterElmDR(attackerElms[elm], receiverElms[weakMatchup]);
      });

      // StrongVs elements Damage
      strongVs.forEach((strongMatchup) =>{
        elmDamageDone[strongMatchup] += _calcElmDamageBonus(attackerElms[elm]);
      });


      // turn damage reduction from mirror elm; reduces damage to all elm matchups
      let sumElmDamageToEachElm = 0;
      let elmCount = 0;
      for(let e in elmDamageDone){
        //console.log(`D to ${e}`,elmDamageDone[e]);
        if(elmDamageDone[e] > 0){
          sumElmDamageToEachElm += elmDamageDone[e];
          elmCount += 1;
        }
      }
 
      // Take the average of the damage this particular attacking elm did to the enemies elms
      // then reduce the total value by the Damage Reduction Formula, considering the foes resistance (mirror elm)
      const average = sumElmDamageToEachElm / elmCount;
      //console.log('AVERAGE - ', average);
      const { reduction, netDamage } = _calcTurnMirrorReduction(average, receiverElms[mirror[0]]);
      turnElmDamageDone[elm] = Math.floor(netDamage);
      turnElmDamageDone.total += Math.floor(netDamage);
      turnElmDamagePrevented[elm] = Math.floor(reduction);
      turnElmDamagePrevented.total += Math.floor(reduction);
    }
  }



  /* 
    THIS IS WHERE WE NEED TO INSERT ELEMENTAL SPECIALTIES
  */
  // First value is total fire of attacker, second is the 'd' factor, which is adjusted down for rounds
  const fireProc = determineFireCrit(attacker.fire, attackerElms.fire);
  attackerElms.fire = fireProc.netDamage;
  console.log('fireProc - ', fireProc);

  const airProc = determineAirEvade(receiver.air, turnElmDamageDone.total);
  console.log(airProc);
  if(airProc.evaded){
    turnElmDamageDone = { fire : 0, earth : 0, water : 0, air : 0, total : 0 };
  }



  //console.log('ENDING ATTACKER ELM DAMAGE :', turnElmDamageDone, turnElmDamagePrevented);
  return { turnElmDamageDone : turnElmDamageDone, turnElmDamagePrevented : turnElmDamagePrevented, fireProc, airProc };
}

// Calculates damage done against an element's counter element (F on E)
function _calcArmorDR(aPower, rArmor){
  let d = aPower;
  let r = rArmor;
  if(r === 0){
    return { reduction : r, netDamage : d };
  }
  // Reduced damage based on amount of resistance
  const dr = (r*10)/ ((r*10)+(ARMOR_DRF*d));
 return { reduction : parseFloat((d * dr).toFixed(2)), netDamage : Math.floor(d - (d * dr)) };
}

function _calcDamage(aPower, rArmor){
  const lowEnd = aPower * DAMAGE_VARIANCE_RANGE[0];
  const highEnd = aPower * DAMAGE_VARIANCE_RANGE[1];
  const power = chance.floating({ min: lowEnd, max: highEnd, fixed: 2 });
  
  const lowEndArmor = rArmor * DAMAGE_VARIANCE_RANGE[0];
  const highEndArmor = rArmor * DAMAGE_VARIANCE_RANGE[1];
  const armor = chance.floating({ min: lowEndArmor, max: highEndArmor, fixed: 2 });

  const { reduction, netDamage } = _calcArmorDR(power, armor);
  //console.log('DAMAGE - ', netDamage, 'REDUCTION - ', reduction);
  return { netDamage : Math.floor(netDamage), reduction : Math.floor(reduction) }
}


function _determineOutcome(winner){
  if(winner === 'Avatar'){
    return { outcome : 'Avatar Wins', avatarStatus : 'Recovering', foeStatus : 'Knocked Out' }; 
  }else if(winner === 'Foe'){
    return { outcome : 'Foe Wins', avatarStatus : 'Knocked Out', foeStatus : 'Recovering' };
  }else{
    return { outcome : 'Draw', avatarStatus : 'Recovering', foeStatus : 'Recovering' };
  }
}

function _checkIfElemental({fire, water, earth, air}){
  const contenderElms = {fire, water, earth, air};
  let hasElementalPower = false;
  for(let elm in contenderElms){
    if(contenderElms[elm] !== 0){
      hasElementalPower = true;
    }
  }
  // If hasElementalPower is true, the contender is elemental, so return true
  return hasElementalPower ? true : false;
}

function _calcHealthLoss(health, damage){
  return Math.floor(health - damage);
}

function _computeBattleTurn(aggressorString, defenderString, aggressor, defender, roundType, foeIsElemental, totals){
  console.log('AGG - ', aggressor);
  switch(aggressorString){
    case 'Avatar':
      // elemental round, avatar is attacking
      if(roundType === 'Elemental'){
        //console.log('ROUND IS ELEMENTAL', aggressor);
        // Calc elm damage, get back damage done and how much was prevented
        const { turnElmDamageDone, turnElmDamagePrevented, fireProc, airProc } = _calcElementDamage(aggressor, defender);
        totals.foeHealthRemaining = _calcHealthLoss(totals.foeHealthRemaining, turnElmDamageDone.total);
        // Add to totals done for damage and reduction
        for(let elm in totals.aElmDamage){
          totals.aElmDamage[elm] += turnElmDamageDone[elm];
        }
        for(let elm in totals.fElmReduction){
          totals.fElmReduction[elm] += turnElmDamagePrevented[elm];
        }

        const elementalProcs = {
          fire : fireProc,
          water : defermineWaterHeal(aggressor.water),
          air : airProc,
          earth : determineEarthThorns(defender.earth, turnElmDamageDone.total)
        }

        // EARTH - Deal damage back to attacker based on earthProc
        totals.avHealthRemaining -= elementalProcs.earth.thornsDamageToAttacker;
        // WATER - Heal based on waterProc
        totals.avHealthRemaining += elementalProcs.water.amountHealed;


        return { defenderHealthLeft : totals.foeHealthRemaining, aggressorHealthLeft : totals.avHealthRemaining, damageDealt : turnElmDamageDone, totals, reduction : turnElmDamagePrevented, elementalProcs };

      // physical round, avatar is attacking
      }else{
        // Calc physical damage, get back damage done and how much was prevented
        const { netDamage, reduction } = _calcDamage(aggressor.power, defender.armor); 
        totals.foeHealthRemaining = _calcHealthLoss(totals.foeHealthRemaining, netDamage);

        // Add to totals done for damage and reduction
        totals.aPhyDamage += netDamage;
        totals.fPhyReduction += reduction;


        return { defenderHealthLeft : totals.foeHealthRemaining, aggressorHealthLeft : totals.avHealthRemaining, damageDealt : netDamage, totals, reduction };

      }

    case 'Foe':
      // elemental round, foe is attacking, foe is elemental
      if(roundType === 'Elemental' && foeIsElemental){

        // Calc elm damage, get back damage done and how much was prevented
        const { turnElmDamageDone, turnElmDamagePrevented, fireProc, airProc } = _calcElementDamage(aggressor, defender);
        elementalDamageDealt = turnElmDamageDone;
        totals.avHealthRemaining = _calcHealthLoss(totals.avHealthRemaining, turnElmDamageDone.total);

        // Add to totals done for damage and reduction
        for(let elm in totals.fElmDamage){
          totals.fElmDamage[elm] += elementalDamageDealt[elm];
        }
        for(let elm in totals.aElmReduction){
          totals.aElmReduction[elm] += turnElmDamagePrevented[elm];
        }
        
        const elementalProcs = {
          fire : fireProc,
          water : defermineWaterHeal(aggressor.water),
          air : airProc,
          earth : determineEarthThorns(defender.earth, turnElmDamageDone.total)
        }

        // EARTH - Deal damage back to attacker based on earthProc
        totals.foeHealthRemaining -= elementalProcs.earth.thornsDamageToAttacker;
        // WATER - Heal based on waterProc
        totals.foeHealthRemaining += elementalProcs.water.amountHealed;

        return { defenderHealthLeft : totals.avHealthRemaining, aggressorHealthLeft : totals.foeHealthRemaining, damageDealt : turnElmDamageDone, totals, reduction : turnElmDamagePrevented, elementalProcs }
      
      // physical round, foe is attacking
      // Used for both regular physical damage turns or for elemental turns when the foe doesn't have any elemental power
      }else{
        // Calc physical damage, get back damage done and how much was prevented
        const { netDamage, reduction } = _calcDamage(aggressor.power, defender.armor); 
        totals.avHealthRemaining = _calcHealthLoss(totals.avHealthRemaining, netDamage);

        // Add to totals done for damage and reduction
        totals.fPhyDamage += netDamage;
        totals.aPhyReduction += reduction;

        return { defenderHealthLeft : totals.avHealthRemaining, aggressorHealthLeft : totals.foeHealthRemaining, damageDealt : netDamage, totals, reduction };

      }

    default:
    return;
  }
}

function doBattle(avatar, foe, goesFirst){
  const battleTurns = [0,1,2,3,4,5,6,7,8,9,10,11,12];
  const elementalTurns = [2,3,6,7,10,11];
  const roundBreakdown = [];

  const goesSecond = goesFirst === 'Avatar' ? 'Foe' : 'Avatar';

  const foeIsElemental = _checkIfElemental(foe);


  var grandTotals = {
    aElmDamage : { fire : 0, earth : 0, air : 0, water : 0, total : 0 },
    fElmReduction : { fire : 0, earth : 0, air : 0, water : 0, total : 0 },
    fElmDamage : { fire : 0, earth : 0, air : 0, water : 0, total : 0 },
    aElmReduction : { fire : 0, earth : 0, air : 0, water : 0, total : 0 },
    aPhyDamage : 0,
    fPhyReduction : 0,
    fPhyDamage : 0,
    aPhyReduction : 0,
    avHealthRemaining : avatar.health,
    foeHealthRemaining : foe.health
  };
  let winnerString = null;
  let i;
  
  for(i = 0; i<battleTurns.length; i++){
    //console.log('ROUND-', battleTurns[i]);

    if(winnerString){ break;}
    
    // because zero-based, if the turn is odd, goesFirst actually doesn't attack, but the other player
    const turnIsOdd = battleTurns[i] % 2 === 0 ? false : true;
    // If the turn is odd, the second player attacks, otherwise it's the first player
    const aggressorString = turnIsOdd ? goesSecond : goesFirst;
    const aggressor = aggressorString === 'Avatar' ? avatar : foe;

    // If the turn is odd, the first player attacks, otherwise it's the second player
    const defenderString = turnIsOdd ? goesFirst : goesSecond;
    const defender = defenderString === 'Avatar' ? avatar : foe;



    const roundType = elementalTurns.includes(battleTurns[i]) ? 'Elemental' : 'Physical';

    const { defenderHealthLeft, aggressorHealthLeft, damageDealt, totals, reduction, elementalProcs } = _computeBattleTurn(aggressorString, defenderString, aggressor, defender, roundType, foeIsElemental, grandTotals);
    if(elementalProcs){
      console.log('PROCS FROM ELM ROUNDS - ', elementalProcs);
    }

    grandTotals = totals;

    roundBreakdown.push({ turn : i, aggressor : aggressorString, defender : defenderString, damageDealt, defenderHealthLeft, aggressorHealthLeft, reduction, elementalProcs });

    if(grandTotals.avHealthRemaining <= 0 || grandTotals.foeHealthRemaining <= 0){
      winnerString = aggressorString;
      winner = aggressor;
      loser = defender;
      //console.log('WINNER = ',aggressorString);
    }else if(battleTurns[i] === 11){
      winnerString = 'Draw';
    }

  }

  console.log('Battle round results = ', roundBreakdown);

  const outcomeData = _determineOutcome(winnerString); 

  const results = {
    aElmDamage : grandTotals.aElmDamage,
    fElmReduction : grandTotals.fElmReduction,
    fElmDamage : grandTotals.fElmDamage,
    aElmReduction : grandTotals.aElmReduction,
    aPhyDamage : grandTotals.aPhyDamage,
    fPhyReduction : grandTotals.fPhyReduction,
    fPhyDamage : grandTotals.fPhyDamage,
    aPhyReduction : grandTotals.aPhyReduction,
    aHealthRemaining : grandTotals.avHealthRemaining,
    fHealthRemaining : grandTotals.foeHealthRemaining,
    outcomeData,
    roundBreakdown
  }
  return results;
}

module.exports = doBattle;