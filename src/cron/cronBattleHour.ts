import { Battle } from "../config/db";
import { sendCronErrorEmail } from "../mail";
import runAllBattles from "../game/battle/runAllBattles";
import { PreBattleObject } from "../types/BackendOnlyTypes";

console.log("*** RUNNING CRON AVATAR BATTLES ***");

// RUN ALL BATTLES VIA HEROKU CRON

(async () => {
  try {
    const battles: PreBattleObject[] = await Battle.findAll({ where: { outcome: "TBD" }, raw: true });
    if (battles.length === 0) {
      console.log("cronBattleHour - no battles to run");
      return;
    }

    await runAllBattles(battles, true);
    console.log("cronBattleHour successfully ran");
    process.exit();
  } catch (error) {
    console.log("CRON BATTLE HOUR ERROR: ", error);
    await sendCronErrorEmail(error, "Error running Cron Battle Hour Script");
    process.exit();
  }
})();
