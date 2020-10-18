const Avatar = require('../db').Avatar;
const { REVIVE_PERCENT } = require('../game/constants');

console.log('*** RUNNING CRON REVIVE ***');

Avatar.findAll(
  { where: { status: "Knocked Out"}, raw: true },
).then((results) => {
  // Loop over each avatar and add up to 5 health
  return results.forEach((result) =>{
    const revivalHealth = result.maxHealth * REVIVE_PERCENT;

    console.log(`reviving Avatar, revived health - ${revivalHealth}`);
    return Avatar.update(
      {health : revivalHealth, status : 'Recovering'},
      { where: { owner: result.owner } }
    )
  });
}).catch((error) =>{
  new Promise((resolve, reject) =>{
    return sendAppErrorEmail({ message : error.message, status : error.status, debug : error.debug },resolve, reject)
  }).catch((error) =>{
    console.log('couldn\'t send error email for error - ', error);
  });
});