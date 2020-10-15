
const Avatar = require('./db').Avatar;
const db = require('./db').db;
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const { REGENERATION_RATE } = require('./game/constants');
const { sendAppErrorEmail } = require('./mail');

console.log('*** RUNNING CRON UPDATE AVATARS *//**');

Avatar.findAll(
  { where: { health: { [Op.lt]: db.col('maxHealth') } }, raw: true },
).then((results) => {
  // Loop over each avatar and add up to 5 health
  results.forEach((result) =>{
    let h = result.health;
    const mH = result.maxHealth;

    if((h + REGENERATION_RATE) > mH){
      result.health = mH;
    }else{
      result.health += REGENERATION_RATE;
    }

    console.log(`updating Avatar health - ${result.name}`);
    Avatar.update(
      {health : result.health},
      { where: { owner: result.owner } }
    )
  });

}).catch((error) =>{
  new Promise((resolve, reject) =>{
    sendAppErrorEmail({ message : error.message, status : error.status, debug : error.debug },resolve, reject)
  }).catch((error) =>{
    console.log('couldn\'t send error email for error - ', error);
  });

});