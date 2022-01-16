import { Avatar } from "../config/db";
import { Op } from "sequelize";
import { parseStats } from "../lib/helperFunctions";
import { REVIVE_AMOUNT, RECOVER_EARLY_MOD } from "../game/CONSTANTS";
import { sendCronErrorEmail } from "../mail";
import chanceInit from "chance";
import HF from "../types/herofit";
const chance = chanceInit();

console.log("*** RUNNING CRON REVIVE ATTEMPT ***");

(async () => {
  try {
    // Get all avatars who are KOed
    const results: HF.Hero[] = await Avatar.findAll({ where: { status: "Knocked Out" }, raw: true, attributes: ["health", "recovery", "status", "owner"] });
    console.log("all KO revive results - ", results);

    const recoveredAvatarOwners: string[] = [];

    if (results.length) {
      // Loop over each Recovering Avatar and add up to default regen + avatar's regen to health
      results.forEach((result, i) => {
        const avatar = parseStats(result);
        const recovery = avatar.recovery;
        const recoverEarlyChance = (recovery / (recovery + RECOVER_EARLY_MOD)) * 100;
        const recoveredEarly = chance.bool({ likelihood: recoverEarlyChance });

        // Revive avatar to the 1 HP
        if (recoveredEarly) {
          console.log("Recovering avatar of owner: ", avatar.owner);
          return recoveredAvatarOwners.push(avatar.owner);
        }
        return null;
      });

      console.log("recovered avatars for - ", recoveredAvatarOwners);
      await Avatar.update({ health: REVIVE_AMOUNT, status: "Recovering" }, { where: { owner: { [Op.in]: recoveredAvatarOwners } } });
    } else {
      console.log("No Avs to Recover");
    }
    process.exit();
  } catch (error) {
    console.log("ERROR TRYING TO DO KO REVIVES", error);
    await sendCronErrorEmail(error, "Error running Cron KO Recovery Script");
    process.exit();
  }
})();
