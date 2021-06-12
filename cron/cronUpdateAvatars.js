const { Avatar } = require('../config/db');
const { Op, col } = require("sequelize");
const { RESTED_THRESHOLD, RECOVERY_EFFECTIVENESS_MOD } = require('../game/CONSTANTS');
const { sendCronErrorEmail } = require('../mail');
const { parseAvatarProperties } = require('../lib/helperFunctions');
console.log('*** RUNNING CRON HEALTH UPDATE AVATARS ***');

//Get all avatars who aren't at full health
Avatar.findAll({ 
  where: { health : { [Op.lt] : col('maxHealth') } },
  raw: true, attributes: ['health','maxHealth','recovery','status', 'owner', 'statusFade'] 
}).then((results) => {
  
  const allPromises = []
  // Loop over each avatar and either regen health if recovering or other status effects
  results.forEach((avatar) =>{
    avatar = parseAvatarProperties(avatar);

    let avatarHealth = avatar.health;
    const maxHealth = avatar.maxHealth;
    const recovery = avatar.recovery;
    const recoveryRetarder = recovery/(recovery+RECOVERY_EFFECTIVENESS_MOD); 
    const adjRegenRate = recovery - Math.round( recovery * recoveryRetarder);
    let avatarStatus = avatar.status;
    let avatarStatusFade = avatar.statusFade;

    // Check avatar status and run appropriate action
    switch(avatarStatus){
      case 'Infected':
        const infectAmount = Math.floor(adjRegenRate / 2);
        // First check if this infect proc will KO hero, if so set him to KOed and health to zero. BREAK so he doesn't regain health
        if((avatarHealth - infectAmount) <= 0){
          avatarStatus = 'Knocked Out';
          avatarHealth = 0;
          avatarStatusFade = 0;
          break;
        // Otherwise, if no more counters, set to recovering and no break statement - the hero will recover health this round
        }else if(avatarStatusFade === 0){
          avatarStatus = 'Recovering';
        
        // If Fade counter is greater than zero AND hero wont be KO from 1 more proc, reduce health of avatar by infect amount and decrement counter. BREAK statement
        }else{
          avatarHealth = avatarHealth - infectAmount;
          --avatarStatusFade;
          break;
        }
      case 'Recovering':
      // Shouldn't happen, but there's a bug where sometimes heroes are rested too early
      case 'Rested':
        // If one tick of health recovery is over maxHealth, just assign maxHealth
        if((avatarHealth + adjRegenRate) > maxHealth){
          avatarHealth = maxHealth;
        // Otherwise add one tick of health back to avatar's health
        }else{
          avatarHealth += adjRegenRate;
        }
        // Update status to 'Rested' if at max health
        if(avatarHealth >= maxHealth){
          avatarStatus = 'Rested';
        }else if(avatar.status !== 'Infected'){
          avatarStatus = 'Recovering';
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