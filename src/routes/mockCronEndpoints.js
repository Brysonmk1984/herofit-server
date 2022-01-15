const express = require("express");
const { body, validationResult } = require("express-validator");
const { authenticateAdminJWT } = require("../jwt/validateJWT");
const router = express.Router();
const { Avatar, AvatarItems, Items, Battle } = require("../config/db");
const { Op, col } = require("sequelize");
const { parseAvatarProperties } = require("../lib/helperFunctions");
const { REVIVE_AMOUNT, RECOVER_EARLY_MOD, RECOVERY_EFFECTIVENESS_MOD } = require("../game/CONSTANTS");
const { selectFoeTemplate } = require("../game/prebattle/foeFunctions");
const { generateFoeStats } = require("../../src/game/prebattle/generateFoeStats");
const { determinePostBattleActions } = require("../game/prebattle/onGoToBattle");
const runAllBattles = require("../game/battle/runAllBattles");
const ALLPBAs = require("../game/postBattleActions.json");
const { sendCronErrorEmail } = require("../mail");
const chance = require("chance")();

// FORCE A CYCLE OF HEALTH REGEN FOR ALL ALLIES
router.get("/regenerate-health", authenticateAdminJWT, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for /regenerate-health endpoint");
  }

  //Get all avatars who aren't at full health
  return Avatar.findAll({
    //where: { health : { [Op.lt] : col('maxHealth') } },
    where: { status: { [Op.or]: ["Infected", "Recovering", "Rested"] } },
    raw: true,
    attributes: ["health", "maxHealth", "recovery", "status", "owner", "statusFade"],
  })
    .then(results => {
      const allPromises = [];
      // Loop over each avatar and either regen health if recovering or other status effects
      results.forEach(avatar => {
        avatar = parseAvatarProperties(avatar);
        console.log("AVV", avatar);
        let avatarHealth = avatar.health;
        const maxHealth = avatar.maxHealth;
        const recovery = avatar.recovery;
        const recoveryRetarder = recovery / (recovery + RECOVERY_EFFECTIVENESS_MOD);
        const adjRegenRate = recovery - Math.round(recovery * recoveryRetarder);
        let avatarStatus = avatar.status;
        let avatarStatusFade = avatar.statusFade;

        // Check avatar status and run appropriate action
        switch (avatarStatus) {
          case "Infected":
            console.log("ASASD");
            const infectAmount = Math.floor(adjRegenRate / 2);
            // First check if this infect proc will KO hero, if so set him to KOed and health to zero. BREAK so he doesn't regain health
            if (avatarHealth - infectAmount <= 0) {
              avatarStatus = "Knocked Out";
              avatarHealth = 0;
              avatarStatusFade = 0;
              break;
              // Otherwise, if no more counters, set to recovering and no break statement - the hero will recover health this round
            } else if (avatarStatusFade === 0) {
              avatarStatus = "Recovering";

              // If Fade counter is greater than zero AND hero wont be KO from 1 more proc, reduce health of avatar by infect amount and decrement counter. BREAK statement
            } else {
              avatarHealth = avatarHealth - infectAmount;
              --avatarStatusFade;
              break;
            }
          case "Recovering":
          // Shouldn't happen, but there's a bug where sometimes heroes are rested too early
          case "Rested":
            // If one tick of health recovery is over maxHealth, just assign maxHealth
            if (avatarHealth + adjRegenRate > maxHealth) {
              avatarHealth = maxHealth;
              // Otherwise add one tick of health back to avatar's health
            } else {
              avatarHealth += adjRegenRate;
            }
            // Update status to 'Rested' if at max health
            if (avatarHealth >= maxHealth) {
              avatarStatus = "Rested";
            } else if (avatar.status !== "Infected") {
              avatarStatus = "Recovering";
            }
            break;
          default:
            break;
        }

        allPromises.push(
          Avatar.update(
            {
              health: avatarHealth,
              status: avatarStatus,
              statusFade: avatarStatusFade,
            },
            {
              where: { owner: avatar.owner },
              returning: true,
              raw: true,
              plain: true,
            },
          ),
        );
      });
      return Promise.allSettled(allPromises);
    })
    .then(results => {
      results.forEach(result => console.log("All Regenerate Results - ", result.status));
      res.formatter.ok(null, "Successfully ran /regenerate-health");
    })
    .catch(error => {
      console.log("ERROR DOING BULK HEALTH UPDATE", error);
      res.formatter.serverError(error.toString(), `Error running /regenerate-health`);
    });
});

// FORCE A CYCLE OF KO RECOVERY CHECK FOR KOED AVATARS
router.get("/try-recovery", authenticateAdminJWT, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for /try-recovery endpoint");
  }

  // Get all avatars who are KOed
  return Avatar.findAll({
    where: { status: "Knocked Out" },
    raw: true,
    attributes: ["health", "recovery", "status", "owner"],
  })
    .then(results => {
      console.log("all KO results", results);
      const recoveredAvatars = [];

      if (results.length) {
        // Loop over each Recovering Avatar and add up to default regen + avatar's regen to health
        results.forEach((result, i) => {
          const avatar = parseAvatarProperties(result);

          const recovery = avatar.recovery;
          const recoverEarlyChance = (recovery / (recovery + RECOVER_EARLY_MOD)) * 100;
          const recoveredEarly = chance.bool({
            likelihood: recoverEarlyChance,
          });
          //console.log('REC - ', recovery, 'REC EARLY CHANCE - ', recoverEarlyChance, recoveredEarly);
          // Revive avatar to the REVIVE_AMOUNT in constants.js
          if (recoveredEarly) {
            console.log("Recovering!", avatar.owner);
            return recoveredAvatars.push(avatar.owner);
          }
          return null;
        });
        console.log("recovered avs", recoveredAvatars);
        return Avatar.update({ health: REVIVE_AMOUNT, status: "Recovering" }, { where: { owner: { [Op.in]: recoveredAvatars } } });
      } else {
        res.formatter.ok(null, "Successfully ran /try-recovery, no Avatars to Recover");
      }
    })
    .then(() => {
      return res.formatter.ok(null, "Successfully ran /try-recovery");
    })
    .catch(error => {
      console.log("ERROR DOING BULK HEALTH UPDATE", error);
      res.formatter.serverError(error.toString(), `Error running /try-recovery`);
    });
});

// RANDOMLY GENERATE A FOE
router.post("/generate-foe", body("avatar").isObject(), authenticateAdminJWT, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for /generate-foe endpoint");
  }
  const foe = selectFoeTemplate(req.body.avatar.level);
  const foeWithStats = Object.assign({}, foe, generateFoeStats(req.body.avatar, foe));
  if (foeWithStats) {
    res.formatter.ok(foeWithStats);
  } else {
    const error = new Error("Couldn't generate foe");
    res.formatter.serverError(error);
  }
});

// MOCK ENDPOINT for DETERMINING PBAs
router.post("/mock-determine-pbas", body("avatar").isObject(), authenticateAdminJWT, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for /mock-determine-pbas");
  }
  const foe = selectFoeTemplate(req.body.avatar.level);
  const foeWithStats = Object.assign({}, foe, generateFoeStats(req.body.avatar, foe));

  new Promise((resolve, reject) => {
    return determinePostBattleActions(req.body.avatar, foeWithStats, resolve, reject);
  })
    .then(postBattleActions => {
      res.formatter.ok({ postBattleActions });
    })
    .catch(error => {
      res.formatter.serverError(error.toString());
    });
});

// MOCK ENDPOINT for RUNNING PBAs
router.get("/mock-run-pbas", authenticateAdminJWT, (req, res) => {
  console.log("didnt get here");
  const errors = validationResult(req);
  if (!errors.isEmpty) {
    return res.formatter.badRequest(errors.array(), "Validation Error - /mock-run-pbas endpoint");
  }
  let _avatarID, _postBattleActions;
  // only meant to grab latest TBD battle, look at the PBAs, and create items from them
  Battle.findOne({
    attributes: ["avatarID", "postBattleActions"],
    where: { outcome: "TBD" },
  })
    .then(({ avatarID, postBattleActions }) => {
      _avatarID = avatarID;
      _postBattleActions = postBattleActions;
      const itemNames = [];

      // ALL PBAs FROM BATTLE
      postBattleActions.forEach(ACTION => {
        let matchingPBA;
        // FOR EACH ACTION TYPE WITHIN THE postBattleActions JSON file.
        for (let actionType in ALLPBAs) {
          // Find the PBA that matches the pba.action property
          let matching = ALLPBAs[actionType].find(pba => pba.action === ACTION);
          // If there's a match, assign the entire matching PBA to a variable that we'll use to get the actual item
          if (matching) {
            matchingPBA = matching;
            break;
          }
        }

        // There should always be a matchingPBA here, if not, I forgot to add one to the postBattleActions.json
        if (matchingPBA) {
          // Push the ITEM that matches a PBA that matches the ACTION, along with the avatarID, into an array
          itemNames.push(matchingPBA.name);
        }
      });
      return Items.findAll({
        where: { name: { [Op.in]: itemNames } },
        raw: true,
      });
    })
    .then(results => {
      const itemsToInsert = results.map(item => {
        return { avatarID: _avatarID, itemID: item.id };
      });

      return AvatarItems.bulkCreate(itemsToInsert);
    })
    .then(() => {
      res.formatter.ok({
        avatarID: _avatarID,
        postBattleActions: _postBattleActions,
      });
    })
    .catch(error => {
      console.log(error);
      res.formatter.serverError(error.toString(), "Database or Server code error for POST /mock-run-pbas endpoint");
    });
});

// DO ALL BATTLES WHERE BATTLE OUTCOME IS TBD
router.get("/run-all-battles", authenticateAdminJWT, (req, res) => {
  // GET ALL TBD BATTLES
  Battle.findAll({
    where: { outcome: "TBD" },
    raw: true,
  })
    .then(battles => {
      return runAllBattles(battles, true);
    })
    .then(data => {
      res.formatter.ok(data, "Successfully ran all battles through endpoint - GET /run-all-battles");
    })
    .catch(error => {
      console.log("ERROR - GET /run-all-battles", error);
      sendCronErrorEmail(error.message, "mockCronEndpoints simulating Cron Script - Error running Cron Battle Hour Script");
    });
});
module.exports = router;
