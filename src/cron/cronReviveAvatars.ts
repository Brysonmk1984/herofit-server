import { Avatar } from "../config/db";
import { REVIVE_AMOUNT } from "../game/CONSTANTS";
import { sendCronErrorEmail } from "../mail";

console.log("*** RUNNING CRON REVIVE ***");

(async () => {
  try {
    await Avatar.update({ health: REVIVE_AMOUNT, status: "Recovering", goToBattle: false }, { where: { status: "Knocked Out" } });
    console.log("REVIVED ALL KO'D");
    process.exit();
  } catch (error) {
    console.log("Error reviving avatars: ", error);
    await sendCronErrorEmail(error.message, "Error running Cron Revive Avatar Script");
    process.exit();
  }
})();
