import { Battle } from "../config/db";
import { sendCronErrorEmail } from "../mail";
import runAllBattles from "../game/battle/runAllBattles";
import { PreBattleObject } from "../types/BackendOnlyTypes";

console.log("*** RUNNING CRON AVATAR BATTLES ***");

// RUN ALL BATTLES VIA HEROKU CRON

(async () => {
  try {
    const battles: PreBattleObject[] = await Battle.findAll({ where: { outcome: "TBD" }, raw: true });
    await runAllBattles(battles, true);
    console.log("cronBattleHour successfully ran");
    process.exit();
  } catch (error) {
    console.log("Error running cron battle hour: ", error);
    await sendCronErrorEmail({
      status: 500,
      message: error.message,
      meta: "Error running Cron Battle Hour Script",
      errorLocation: "Cron Script",
      version: process.env.VERSION,
    });
    process.exit();
  }
})();
