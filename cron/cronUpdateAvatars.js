
const Avatar = require('../db').Avatar;
const db = require('../db').db;
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
 const { REGENERATION_RATE, RESTED_THRESHOLD } = require('../game/constants');
 const { sendAppErrorEmail } = require('../mail');

console.log('*** RUNNING CRON UPDATE AVATARS ***', Avatar);


Avatar.findAll(
  { where: { health: { [Op.lt]: db.col('maxHealth') } }, raw: true },
).then((results) => {
  // Loop over each avatar and add up to 5 health

  
  return results.forEach((result) =>{
    let h = result.health;
    const mH = result.maxHealth;
    console.log('RESULT', result);
    if((h + REGENERATION_RATE) > mH){
      result.health = mH;
    }else{
      result.health += REGENERATION_RATE;
    }

    if(result.status === 'Recovering'){
      console.log('RECOVERING = ',result.status === 'Recovering', RESTED_THRESHOLD);
      result["status"] = (h / mh) > RESTED_THRESHOLD ? 'Rested' : 'Recovering';
      console.log('RS', result["status"])
    }


    console.log(`updating Avatar health - ${result.name}`);
    return Avatar.update(
      {health : result.health, status : result["status"]},
      { where: { owner: result.owner } }
    ).then((updateConfirm) =>{
      console.log('UPDATED!', updateConfirm);
    }).catch((error) => {
      console.log('ERRROR', err);
      return sendAppErrorEmail({ message : error.message, status : error.status, debug : error.debug },resolve, reject);
    });
  });

}).catch((error) =>{
  new Promise((resolve, reject) =>{
    return sendAppErrorEmail({ message : error.message, status : error.status, debug : error.debug },resolve, reject);
  }).catch((err) =>{
    console.log('couldn\'t send error email for error - ', err);
  });

});