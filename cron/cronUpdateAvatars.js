
const Avatar = require('../db').Avatar;
 const { REGENERATION_RATE, RESTED_THRESHOLD } = require('../game/constants');
 const { sendAppErrorEmail } = require('../mail');

console.log('*** RUNNING CRON HEALTH UPDATE AVATARS ***');

// Get all avatars who aren't at full health
return Avatar.findAll(
  { where: { status: 'Recovering' }, raw: true, attributes: ['health','maxHealth','recovery','status', 'owner'] },
).then((results) => {

  // Loop over each Recovering Avatar and add up to default regen + avatar's regen to health
  results.forEach((result) =>{
    result = parseAvatarProperties(result);
    
    let h = result.health;
    const mH = result.maxHealth;
    const adjRegenRate = REGENERATION_RATE + result.recovery;
  
    if((h + adjRegenRate) > mH){
      result.health = mH;
    }else{
      result.health += adjRegenRate;
    }
    // Update status if over 'Rested' threshold
    let updatedStatus = 'Recovering';
    if((result.health / mH) >= RESTED_THRESHOLD){
      updatedStatus = 'Rested';
    }
    return Avatar.update(
      {health : result.health, status : updatedStatus},
      { where: { owner: result.owner } }
    )
  });

}).catch((error) =>{
  return new Promise((resolve, reject) =>{
    return sendAppErrorEmail({ message : error.message, status : error.status, debug : error.debug },resolve, reject)
  }).catch((error) =>{
    console.log('couldn\'t send error email for error - ', error);
    next();
  });
});