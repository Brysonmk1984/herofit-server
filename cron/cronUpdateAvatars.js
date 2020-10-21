
const Avatar = require('../db').Avatar;
const db = require('../db').db;
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
 const { REGENERATION_RATE, RESTED_THRESHOLD } = require('../game/constants');
 const { sendAppErrorEmail } = require('../mail');

console.log('*** RUNNING CRON UPDATE AVATARS ***');


Avatar.findAll(
  { where: { health: { [Op.lt]: db.col('maxHealth') } }, raw: true },
).then((results) => {
  // Loop over each avatar and add up to 5 health

  return results.forEach((result) =>{
    let h = result.health;
    const mH = result.maxHealth;
    console.log('RESULT', result, h);
    if((h + REGENERATION_RATE) > mH){
      result.health = mH;
    }else{
      result.health += REGENERATION_RATE;
    }
    let updatedStatus;
    if(result.status === 'Recovering'){
      updatedStatus = 'Recovering';
      console.log('JUST BEFORE');
      console.log(mH);
      console.log((h / mH) > RESTED_THRESHOLD);

      if((h / mH) > RESTED_THRESHOLD){
        updatedStatus = 'Rested';
      }
    }
    console.log(updatedStatus);
    return Avatar.update(
      {health : result.health, "status" : updatedStatus},
      { where: { owner: result.owner } }
    ).then((updateConfirm) =>{
    }).catch((error) => {
      console.log('ERRROR', err);
      return sendAppErrorEmail(error,resolve, reject);
    });
  });

}).catch((error) =>{
  new Promise((resolve, reject) =>{
    return sendAppErrorEmail(error ,resolve, reject);
  }).catch((err) =>{
    console.log('couldn\'t send error email for error - ', err);
  });

});