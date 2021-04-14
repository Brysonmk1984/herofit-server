const Avatar = require('../db').Avatar;

function resetQP(id){
  return Avatar.findOne({
    attributes : ['qp', 'qpPower', 'qpHealth', 'qpArmor', 'qpRecovery', 'qpFire', 'qpEarth', 'qpAir', 'qpWater',
    'power', 'maxHealth', 'armor', 'recovery', 'fire', 'earth', 'air', 'water', 'health'],
    where : { id }
  }).then(({ qp, qpPower, qpHealth, qpArmor, qpRecovery, qpFire, qpEarth, qpAir, qpWater, power, maxHealth, armor, recovery, fire, earth, air, water, health }) =>{
    const totalQP = qp + qpPower + qpHealth + qpArmor + qpRecovery + qpFire + qpEarth + qpAir + qpWater;
    const adjustedHealth = maxHealth - qpHealth;

    const updatedAttributes = {
      qp : totalQP,
      power : power - qpPower,
      maxHealth : adjustedHealth,
      armor : armor - qpArmor,
      recovery : recovery - qpRecovery,
      fire : fire - qpFire,
      earth : earth - qpEarth,
      air : air - qpAir,
      water: water - qpWater,
      qpPower : 0,
      qpHealth : 0,
      qpArmor : 0,
      qpRecovery : 0,
      qpFire : 0,
      qpEarth : 0,
      qpAir : 0,
      qpWater : 0,
      // Need to change health of avatar if it's over the amount of the new maxHealth
      health : health > adjustedHealth ? adjustedHealth : health
    };

    return Avatar.update(
      updatedAttributes,
      { where : { id }, returning : true }
    );
  }).then((data) =>{
    console.log('success!', data);
    return data[1][0];
  }).catch((error) =>{
    console.log('error', error);
    return error;
  });
}

function itemEffects(effects, avatarID){
  const effectPromises = [];
  effects.forEach((effect) =>{
      switch(effect){
        case 'Reset QP':
            effectPromises.push(resetQP(avatarID)); 
        default:
          break;
      }
  });

  return Promise.all(effectPromises);
}

module.exports = { itemEffects };