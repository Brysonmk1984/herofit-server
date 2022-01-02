import HF from "../types/herofit";
import { Avatar } from "../config/db";
import { Op } from "sequelize";
import { RECOVERY_EFFECTIVENESS_MOD } from "../game/CONSTANTS";
import { sendCronErrorEmail } from "../mail";
import { parseAvatarProperties } from "../lib/helperFunctions";

console.log("*** RUNNING CRON HEALTH UPDATE AVATARS ***");

(async () => {
  try {
    // Update all heroes who aren't at full health and aren't Knocked Out
    const results: HF.Hero[] = await Avatar.findAll({ where: { status: { [Op.or]: ["Infected", "Recovering", "Rested"] } }, raw: true, attributes: ["health", "maxHealth", "recovery", "status", "owner", "statusFade"] });
    const allPromises: Promise<any>[] = [];

    // Loop over each hero and either regen health if recovering or other status effects
    results.forEach((hero: HF.Hero) => {
      hero = parseAvatarProperties(hero);
      let heroHealth = hero.health;
      const maxHealth = hero.maxHealth;
      const recovery = hero.recovery;
      const recoveryRetarder = recovery / (recovery + RECOVERY_EFFECTIVENESS_MOD);
      const adjRegenRate = recovery - Math.round(recovery * recoveryRetarder);
      let heroStatus = hero.status;
      let heroStatusFade = hero.statusFade;

      // Check hero status and run appropriate action
      switch (heroStatus) {
        case "Infected":
          const infectAmount = Math.floor(adjRegenRate / 2);
          // First check if this infect proc will KO hero, if so set him to KOed and health to zero. BREAK so he doesn't regain health
          if (heroHealth - infectAmount <= 0) {
            heroStatus = "Knocked Out";
            heroHealth = 0;
            heroStatusFade = 0;
            break;
            // Otherwise, if no more counters, set to recovering and no break statement - the hero will recover health this round
          } else if (heroStatusFade === 0) {
            heroStatus = "Recovering";

            // If Fade counter is greater than zero AND hero wont be KO from 1 more proc, reduce health of hero by infect amount and decrement counter. BREAK statement
          } else {
            heroHealth = heroHealth - infectAmount;
            --heroStatusFade;
            break;
          }
        case "Recovering":
        // Shouldn't happen, but there's a bug where sometimes heroes are rested too early
        case "Rested":
          // If one tick of health recovery is over maxHealth, just assign maxHealth
          if (heroHealth + adjRegenRate > maxHealth) {
            heroHealth = maxHealth;
            // Otherwise add one tick of health back to hero's health
          } else {
            heroHealth += adjRegenRate;
          }
          // Update status to 'Rested' if at max health
          if (heroHealth >= maxHealth) {
            heroStatus = "Rested";
          } else if (hero.status !== "Infected") {
            heroStatus = "Recovering";
          }
          break;
        default:
          break;
      }

      allPromises.push(
        Avatar.update(
          {
            health: heroHealth,
            status: heroStatus,
            statusFade: heroStatusFade,
          },
          {
            where: { owner: hero.owner },
            returning: true,
            raw: true,
            plain: true,
          },
        ),
      );
    });
    await Promise.allSettled(allPromises);
    process.exit();
  } catch (error) {
    console.log("ERROR DOING BULK HEALTH UPDATE", error);

    await sendCronErrorEmail({
      status: 500,
      message: error.message,
      meta: "Error running Cron Update Avatar Script",
      errorLocation: "Cron Script",
      version: process.env.VERSION,
    });
    process.exit();
  }
})();
