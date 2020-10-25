const Avatar = require('../db').Avatar;
const { REVIVE_AMOUNT } = require('../game/constants');
const { connectionManager } = require("sequelize");
const { sendAppErrorEmail} = require('../mail');

console.log('*** RUNNING CRON REVIVE ***');

return Avatar.update(
    { health : REVIVE_AMOUNT, status : 'Recovering' },
    { where: { status: 'Knocked Out' }}
).then(()=>{
  console.log('REVIVED ALL KOED');
  connectionManager.close().then(() => console.log('shut down gracefully'));
}).catch((error) =>{
  connectionManager.close().then(() => console.log('shut down gracefully'));
  new Promise((resolve, reject) =>{
    return sendAppErrorEmail({ message : error.message, status : error.status, debug : error.debug },resolve, reject)
  }).catch((error) =>{
    console.log('couldn\'t send error email for error - ', error);
    connectionManager.close().then(() => console.log('shut down gracefully'));
  });
});