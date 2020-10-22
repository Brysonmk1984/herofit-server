const Avatar = require('../db').Avatar;
const { Op } = require("sequelize");
const { parseAvatarProperties } = require('../helperFunctions');
const { REVIVE_AMOUNT } = require('../game/constants');
const { sendAppErrorEmail} = require('../mail');

console.log('*** RUNNING CRON REVIVE ATTEMPT ***');

// Get all avatars who are KOed
Avatar.findAll(
  { where: { status: "Knocked Out" }, raw: true, attributes: ['health', 'recovery','status', 'owner'] },
).then((results) => {
  const recoveredAvatars = []

  // Loop over each Recovering Avatar and add up to default regen + avatar's regen to health
  results.forEach((result, i) =>{
    result = parseAvatarProperties(result);
    const recoveryChance = result.recovery >= 100 ? 100 : result.recovery;

    // THESE ARE THE NUMBERS THAT IF MATCHED IN THE WHILE LOOP, WILL ALLOW AVATAR TO RECOVER EARLY
    const recoveryWinners = [];
    for(let i = 0; i < recoveryChance; i++){
      recoveryWinners.push(Math.floor(Math.random() * 100));
    }
    const winningNum = Math.floor(Math.random() * 100);
    const found = recoveryWinners.includes(winningNum);
    
    // Revive avatar to the REVIVE_AMOUNT in constants.js
    if(found){
      return recoveredAvatars.push(result.owner);
    }
    return null;

  });
  return Avatar.update(
    { health : REVIVE_AMOUNT, status : 'Recovering' },
    { where: { owner: { [Op.in]: recoveredAvatars } }}
  );
}).then(()=>{
  console.log('SHOULD HAVE ATTEMPTED KO RECOVERY');
}).catch((error) =>{
  console.log('ERROR TRYING TO DO KO REVIVES', error);
  return new Promise((resolve, reject) =>{
    return sendAppErrorEmail({ message : error.message, name : error.name },resolve, reject)
  }).catch((error) =>{
    console.log('couldn\'t send error email for error - ', error);
  });
});