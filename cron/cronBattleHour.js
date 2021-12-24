const { Battle } = require("../config/db");
const { sendCronErrorEmail } = require("../mail");
const runAllBattles = require("../game/battle/runAllBattles");

console.log("*** RUNNING CRON AVATAR BATTLES ***");

// RUN ALL BATTLES VIA HEROKU CRON
Battle.findAll({
  where: { outcome: "TBD" },
  raw: true,
})
  .then(battles => {
    return runAllBattles(battles, true);
  })
  .then(data => {
    console.log("cronBattleHour successfully ran");
    process.exit();
  })
  .catch(error => {
    new Promise((resolve, reject) => {
      return sendCronErrorEmail(
        {
          message: error.message,
          status: error.status,
          debug: error.debug,
          errorLocation: "Cron Script",
        },
        resolve,
        reject,
      );
    })
      .then(() => {
        process.exit();
      })
      .catch(error => {
        console.log("couldn't send error email for REVIVE AVATARS - ", error);
        process.exit();
      });
  });
