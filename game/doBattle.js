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
function _calcOverallMirrorReduction(aDamage, rResistance){
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
    fire : Math.floor(attacker.fire),
    earth : Math.floor(attacker.earth),
    water : Math.floor(attacker.water),
    air : Math.floor(attacker.air),
  };
  const receiverElms = {
    fire : Math.floor(receiver.fire),
    earth : Math.floor(receiver.earth),
    water : Math.floor(receiver.water),
    air : Math.floor(receiver.air),
  };

  const overallElmDamageDone = {
    fire : 0,
    earth : 0,
    water : 0,
    air : 0,
    total : 0
  };

  const overallElmDamagePrevented = {
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


      // Overall damage reduction from mirror elm; reduces damage to all elm matchups
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
      const { reduction, netDamage } = _calcOverallMirrorReduction(average, receiverElms[mirror[0]]);
      overallElmDamageDone[elm] = Math.floor(netDamage);
      overallElmDamageDone.total += Math.floor(netDamage);
      overallElmDamagePrevented[elm] = Math.floor(reduction);
      overallElmDamagePrevented.total += Math.floor(reduction);
    }
  }
  //console.log('ENDING ATTACKER ELM DAMAGE :', overallElmDamageDone);
  return { overallElmDamageDone, overallElmDamagePrevented };
}

// Calculates damage done against an element's counter element (F on E)
function _calcArmorDR(aPower, rArmor){
  let d = aPower;
  let r = rArmor;
  if(r === 0){
    return { reduction : r, netDamage : d };
  }
  // Reduced damage based on amount of resistance
  const dr = (r*10)/ ((r*10)+(3*d));
 return { reduction : parseFloat((d * dr).toFixed(2)), netDamage : Math.floor(d - (d * dr)) };
}

function _calcDamage(aPower, rArmor){
  return _calcArmorDR(aPower, rArmor);
}


function _determineOutcome(aHealth, fHealth){
  const avIsDead = aHealth <= 0;
  const foeIsDead = fHealth <=0;

  if(avIsDead){
    if(foeIsDead){
      return { outcome : 'Double KO', avatarStatus : 'Knocked Out', foeStatus : 'Knocked Out' };
    }
    return { outcome : 'Foe Wins', avatarStatus : 'Knocked Out', foeStatus : 'Recovering' };
  }else if(foeIsDead){
    return { outcome : 'Avatar Wins', avatarStatus : 'Recovering', foeStatus : 'Knocked Out' };
  }else{
    return { outcome : 'Draw', avatarStatus : 'Recovering', foeStatus : 'Recovering' };
  }
}

function doBattle(avatar, foe){
  // Physical damage  
  const avatarPhyAttack = _calcDamage(avatar.power, foe.armor);
  const foePhyAttack = _calcDamage(foe.power, avatar.armor);

  // Elemental Damage and Resist
  const avatarElmAttack = _calcElementDamage(avatar, foe);
  const foeElmAttack = _calcElementDamage(foe, avatar);

  /* 
  Bug here, for some reason the elemental reduction result is the same for both avatar and foe!!
  */
  const aHealthRemaining = Math.floor(avatar.health - (foePhyAttack.netDamage + foeElmAttack.overallElmDamageDone.total));
  const fHealthRemaining = Math.floor(foe.health - (avatarPhyAttack.netDamage + avatarElmAttack.overallElmDamageDone.total));

  const outcomeData = _determineOutcome(aHealthRemaining, fHealthRemaining);

  const results = {
    aElmDamage : avatarPhyAttack.overallElmDamageDone,
    fElmReduction : avatarElmAttack.overallElmDamagePrevented,
    fElmDamage : foePhyAttack.overallElmDamageDone,
    aElmReduction : foeElmAttack.overallElmDamagePrevented,
    aPhyDamage : avatarPhyAttack.netDamage,
    fPhyReduction : avatarPhyAttack.reduction,
    fPhyDamage : foePhyAttack.netDamage,
    aPhyReduction : foePhyAttack.reduction,
    aHealthRemaining,
    fHealthRemaining,
    outcomeData
  }
  return results;
}

module.exports = doBattle;