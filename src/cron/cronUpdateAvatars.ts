import HF from "../types/herofit";
import { Avatar } from "../config/db";
import { Op, col, literal } from "sequelize";
import { RECOVERY_EFFECTIVENESS_MOD } from "../game/CONSTANTS";
import { sendCronErrorEmail } from "../mail";
import { parseStats } from "../lib/helperFunctions";
import heroList from "../heroList.json";
import Chance from "chance";
import { HeroChoice } from "../types/BackendOnlyTypes";
const chance = Chance();

console.log("*** RUNNING CRON HEALTH UPDATE AVATARS ***");

(async () => {
  try {
    // 1. UPDATER FOR SOLAR WARRIOR TRAIT ONLY
    await Avatar.update({ photonTokens: literal(`"photonTokens" + ${chance.bool({ likelihood: 50 }) ? 2 : 1}`) }, { where: { character: "Solar Celeste", health: { [Op.eq]: col("maxHealth") } } });

    // 2. UPDATER FOR HEALTH & STATUS HOURLY REGENERATION
    const heroes: HF.Hero[] = await Avatar.findAll({
      where: { status: { [Op.or]: ["Infected", "Recovering"] } },
      raw: true,
      attributes: ["health", "maxHealth", "recovery", "status", "owner", "statusFade", "character", "name"],
    });

    console.log("HEROES TO BE UPDATED: ", heroes.map(h => h.name).join());

    // Loop over each avatar and either regen health if recovering or other status effects
    const updatedHeroes = heroes.map(hero => {
      const h = { ...parseStats(hero) } as HF.Hero;

      const recoveryRetarder = h.recovery / (h.recovery + RECOVERY_EFFECTIVENESS_MOD);
      const adjRegenRate = h.recovery - Math.round(h.recovery * recoveryRetarder);

      const passiveAbility = (heroList as HeroChoice[]).find((heroInList: HeroChoice) => heroInList.character === h.character).passive;

      // Check avatar status and run appropriate action
      switch (h.status) {
        case "Infected":
          const infectAmount = Math.floor(adjRegenRate / 2);
          // First check if this infect proc will KO hero, if so set him to KOed and health to zero. BREAK so he doesn't regain health
          if (h.health - infectAmount <= 0) {
            h.status = "Knocked Out";
            h.health = 0;
            h.statusFade = 0;
            // Otherwise, if no more counters, set to recovering and no break statement - the hero will recover health this round
          } else if (h.statusFade === 0) {
            h.status = "Recovering";
            // If Fade counter is greater than zero AND hero wont be KO from 1 more proc, reduce health of avatar by infect amount and decrement counter. BREAK statement
          } else {
            h.health = h.health - infectAmount;
            --h.statusFade;
          }
          break;
        case "Recovering":
          // If one tick of health recovery is over maxHealth, just assign maxHealth
          if (h.health + adjRegenRate > h.maxHealth) {
            h.health = h.maxHealth;
            // Otherwise add one tick of health back to avatar's health
          } else {
            h.health += passiveAbility.name === "Rampant Regeneration" ? adjRegenRate * 1.33 : adjRegenRate;
          }

          // Update status to 'Rested' if at max health
          if (h.health >= h.maxHealth) {
            h.status = "Rested";
          }

          break;
        default:
          break;
      }

      return h;
    });

    // If I upgrade to Seqeulize 5, I could use this instead of many promises
    // await Avatar.bulkCreate(updatedHeroes, { updateOnDuplicate : [ "health", "status", "statusFade" ] } ),
    const heroUpdatePromises = updatedHeroes.map((h: HF.Hero) => {
      return Avatar.update({ health: h.health, status: h.status, statusFade: h.statusFade }, { where: { owner: h.owner } });
    });

    await Promise.all(heroUpdatePromises);

    // 3. UPDATER JUST IN CASE STATUS FALLS OUT OF SYNC
    // Shouldn't ever have any results, but there was a bug in the past where status would somehow be Rested but their health was below max.
    await Avatar.update({ status: "Recovering" }, { where: { status: "Rested", health: { [Op.lt]: col("maxHealth") } } });
  } catch (error) {
    console.log("ERROR DOING BULK HEALTH UPDATE", error);

    await sendCronErrorEmail(error.toString(), "Error running Cron Update Avatar Script");
    process.exit();
  }
})();
