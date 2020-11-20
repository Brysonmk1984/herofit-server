const Avatar = require('../db').Avatar;
const { Op } = require("sequelize");
const { parseAvatarProperties } = require('../helperFunctions');
const { REVIVE_AMOUNT, KO_RECOVERY_RETARDER } = require('../game/constants');
const { sendCronErrorEmail } = require('../mail');
const db = require('../db').db;
console.log('*** RUNNING CRON REVIVE ATTEMPT ***');

// Get all avatars who are KOed
Avatar.findAll(
  { where: { status: "Knocked Out" }, raw: true, attributes: ['health', 'recovery','status', 'owner'] },
).then((results) => {console.log('all KO results', results);
  const recoveredAvatars = []

  if(results.length){
    // Loop over each Recovering Avatar and add up to default regen + avatar's regen to health
    results.forEach((result, i) =>{
      result = parseAvatarProperties(result);
      const recoveryChance = result.recovery;

      // THESE ARE THE NUMBERS THAT IF MATCHED IN THE WHILE LOOP, WILL ALLOW AVATAR TO RECOVER EARLY
      const recoveryWinners = [];
      for(let i = 0; i < recoveryChance; i++){
        recoveryWinners.push(Math.floor(Math.random() * 100));
      }
      const winningNum = Math.floor(Math.random() * 100);
      const found = recoveryWinners.includes(winningNum);
      
      // Need to restrict how effective KO recovery is
      let winnerRetarder = false;
      if(Math.random() < KO_RECOVERY_RETARDER){
        winnerRetarder = true;
      }

      // Revive avatar to the REVIVE_AMOUNT in constants.js
      if(winnerRetarder && found){
        console.log('Found & Recovering!', result.owner);
        return recoveredAvatars.push(result.owner);
      }
      return null;

    });
    console.log('recovered avs', recoveredAvatars);
    return Avatar.update(
      { health : REVIVE_AMOUNT, status : 'Recovering' },
      { where: { owner: { [Op.in]: recoveredAvatars } }}
    );
  }else{
    console.log('No Avs to Recover');
    process.exit();
  }
}).then((avUpdate)=>{
  console.log('SHOULD HAVE ATTEMPTED KO RECOVERY', avUpdate);
  process.exit();
}).catch((error) =>{
  console.log('ERROR TRYING TO DO KO REVIVES', error);
  return new Promise((resolve, reject) =>{
    return sendCronErrorEmail({ message : error.message, name : error.name },resolve, reject)
  }).then(()=>{
    process.exit();
  })
  .catch((error) =>{
    console.log('couldn\'t send error email TRY KO RECOVERY - ', error);
    process.exit();
  });
});