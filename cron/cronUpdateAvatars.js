
const Avatar = require('../db').Avatar;
const { REGENERATION_RATE, RESTED_THRESHOLD } = require('../game/constants');
const {close } = require("sequelize");
const { sendAppErrorEmail } = require('../mail');
const { parseAvatarProperties } = require('../helperFunctions');
console.log('*** RUNNING CRON HEALTH UPDATE AVATARS ***');

//Get all avatars who aren't at full health
Avatar.findAll(
  { where: { status: 'Recovering' }, raw: true, attributes: ['health','maxHealth','recovery','status', 'owner'] },
).then((results) => {
  
  const allPromises = []
  
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
    allPromises.push(Avatar.update(
      {health : result.health, status : updatedStatus},
      { where: { owner: result.owner },
      returning: true,
      raw: true, 
      plain: true
    }));
  });
  return Promise.allSettled(allPromises);

}).then((results) => {
  results.forEach((result) => console.log('All Regenerate Results - ', result.status));
  return connectionManager.close().then(() => console.log('shut down gracefully'));
}).catch((error) =>{
    console.log('ERROR DOING BULK HEALTH UPDATE', error);
    close().then(() => console.log('shut down gracefully'));
  return new Promise((resolve, reject) =>{
    return sendAppErrorEmail({ message : error.message, name : error.name },resolve, reject)
  }).catch((error) =>{
    console.log('couldn\'t send error email for error - ', error);
  });
});