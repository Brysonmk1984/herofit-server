const Avatar = require('../routes/config/db').Avatar;
const { Op } = require("sequelize");
const { parseAvatarProperties } = require('../lib/helperFunctions');
const { REVIVE_AMOUNT, RECOVER_EARLY_MOD } = require('../game/CONSTANTS');
const { sendCronErrorEmail } = require('../mail');
const db = require('../routes/config/db').db;
const chance = require('chance')();
console.log('*** RUNNING CRON REVIVE ATTEMPT ***');

// Get all avatars who are KOed
Avatar.findAll(
  { where: { status: "Knocked Out" }, raw: true, attributes: ['health', 'recovery','status', 'owner'] },
).then((results) => {console.log('all KO results', results);
  const recoveredAvatars = []

  if(results.length){
    // Loop over each Recovering Avatar and add up to default regen + avatar's regen to health
    results.forEach((result, i) =>{
      avatar = parseAvatarProperties(result);
      const recovery = avatar.recovery
      const recoverEarlyChance = (recovery / (recovery + RECOVER_EARLY_MOD)) * 100;
      const recoveredEarly = chance.bool({ likelihood: recoverEarlyChance });

      // Revive avatar to the 1 HP
      if(recoveredEarly){
        console.log('Recovering!', avatar.owner);
        return recoveredAvatars.push(avatar.owner);
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