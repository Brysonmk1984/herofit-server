import { Battle } from "../config/db";
import { sendCronErrorEmail } from "../mail";
import runAllBattles from "../game/battle/runAllBattles";
import { PreBattleObject } from "../types/BackendOnlyTypes";

console.log("*** RUNNING CRON AVATAR BATTLES ***");

// RUN ALL BATTLES VIA HEROKU CRON

(async () => {
  try {
    const battles: PreBattleObject[] = await Battle.findAll({ where: { outcome: "TBD" }, raw: true });
    console.log('BATT', battles);
    if(typeof battles === 'undefined'){
      return;
    }
    await runAllBattles(battles, true);
    console.log("cronBattleHour successfully ran");
    process.exit();
  } catch (error) {
    console.log("Error running cron battle hour: ", error);
    await sendCronErrorEmail(error.message, "Error running Cron Battle Hour Script");
    process.exit();
  }
})();
