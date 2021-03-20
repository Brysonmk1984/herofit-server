const Avatar = require('../db').Avatar;
const { Op } = require("sequelize");
const { REGENERATION_RATE, RESTED_THRESHOLD } = require('../game/constants');
//const db = require('../db').db;
const { sendCronErrorEmail } = require('../mail');
const { parseAvatarProperties } = require('../helperFunctions');
console.log('*** RUNNING CRON HEALTH UPDATE AVATARS ***');

//Get all avatars who aren't at full health
Avatar.findAll(
  { where: { [Op.or]: [{status: 'Recovering'}, {status: 'Infected'}] }, raw: true, attributes: ['health','maxHealth','recovery','status', 'owner', 'statusFade'] },
).then((results) => {
  
  const allPromises = []
  // Loop over each avatar and either regen health if recovering or other status effects
  results.forEach((avatar) =>{
    avatar = parseAvatarProperties(avatar);

    let avatarHealth = avatar.health;
    const maxHealth = avatar.maxHealth;
    const adjRegenRate = REGENERATION_RATE + avatar.recovery;
    let avatarStatus = avatar.status;
    let avatarStatusFade = avatar.statusFade;

    // Check avatar status and run appropriate action
    switch(avatarStatus){
      case 'Infected':
        const infectAmount = Math.floor(adjRegenRate / 2);
        // If no more counters, set to recovering and no break statement - the hero will recover health this round
        if(avatarStatusFade === 0){
          avatarStatus = 'Recovering';
        // If Fade counter is greater than zero, reduce health of avatar by infect amount and decrement counter. BREAK statement
        }else{
          avatarHealth = avatarHealth - infectAmount;
          --avatarStatusFade;
          break;
        }
      case 'Recovering':
        // If one tick of health recovery is over maxHealth, just assign maxHealth
        if((avatarHealth + adjRegenRate) > maxHealth){
          avatarHealth = maxHealth;
        // Otherwise add one tick of health back to avatar's health
        }else{
          avatarHealth += adjRegenRate;
        }
        // Update status to 'Rested' if over 'Rested' threshold
        if((avatarHealth / maxHealth) >= RESTED_THRESHOLD){
          avatarStatus = 'Rested';
        }
        break;
      default: 
        break;
    }

    allPromises.push(Avatar.update(
      {health : avatarHealth, status : avatarStatus, statusFade : avatarStatusFade},
      { where: { owner: avatar.owner },
      returning: true,
      raw: true, 
      plain: true
    }));
  });
  return Promise.allSettled(allPromises);

}).then((results) => {
  results.forEach((result) => console.log('All Regenerate Results - ', result.status));
  return process.exit();
}).catch((error) =>{
    console.log('ERROR DOING BULK HEALTH UPDATE', error);
    //db.close();
  return new Promise((resolve, reject) =>{
    return sendCronErrorEmail({ message : error.message, name : error.name, errorLocation : "Cron Script" },resolve, reject)
  }).catch((error) =>{
    console.log('couldn\'t send error email for UPDATE AVATAR CRON - ', error);
    process.exit();
  });
});