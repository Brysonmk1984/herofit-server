
const Avatar = require('../db').Avatar;
const { REVIVE_AMOUNT } = require('../game/CONSTANTS');
const { sendCronErrorEmail } = require('../mail');
//const db = require('../db').db;
console.log('*** RUNNING CRON REVIVE ***');

return Avatar.update(
    { health : REVIVE_AMOUNT, status : 'Recovering', goToBattle : false },
    { where: { status: 'Knocked Out' }}
).then(()=>{
  console.log('REVIVED ALL KOED');
  process.exit();
}).catch((error) =>{

  new Promise((resolve, reject) =>{
    return sendCronErrorEmail({ message : error.message, status : error.status, debug : error.debug },resolve, reject)
  }).catch((error) =>{
    console.log('couldn\'t send error email for REVIVE AVATARS - ', error);
    process.exit();
  });
});