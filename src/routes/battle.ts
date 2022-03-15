import express, { Request, Response } from "express";
import { body, validationResult, oneOf } from "express-validator";
import { authenticateJWT } from "../jwt/validateJWT";
import { Op, Sequelize } from "sequelize";
import { Avatar, AvatarItems, Battle, Items, db } from "../config/db";
import villains from "../game/villains.json";
import avCalc from "../game/upgrades/avCalc";
import moment from "moment";
import ALLPBAs from "../game/postBattleActions.json";
import instantiateBattle from "../game/prebattle/instantiateBattle";
import battleProcess from "../game/battle/battleProcess";
import HF from "../types/herofit";
import { AllPbaTypes, PBAType, PostBattleActions, TypedRequestBody } from "../types/BackendOnlyTypes";

const router = express.Router();

interface InsertBattleBody {
  email: string;
  avatar: HF.Hero;
}

// USER CLICKED 'GO TO BATTLE'
router.post(
  "/insert-battle",
  body("email").isEmail(),
  body("avatar").isObject(),
  body("avatar.goToBattle")
    .isBoolean()
    .custom(goToBattle => goToBattle === false),
  authenticateJWT,
  async (req: TypedRequestBody<InsertBattleBody>, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.formatter.badRequest(errors.array(), "Validation Error - POST /insert-battle endpoint");
    }
    const avatar = req.body.avatar;

    try {
      db.transaction(async t => {
        // Instantiate battle instance
        const battleObj = await instantiateBattle(avatar.id, null, t);
        // Update Hero to reflect goToBattle status change
        await Avatar.update({ goToBattle: true }, { where: { owner: req.body.email }, transaction: t });
        res.formatter.ok(battleObj);
      });
    } catch (error) {
      console.log("ERROR in /insert-battle", error);
      res.formatter.serverError(error.toString(), "Database update or server code error - POST /insert-battle");
    }
  },
);

interface FetchBattleReportBody {
  avatarID?: number;
  owner?: string;
}
// USER Logs in after a battle, or clicks button to retrieve report
router.post("/fetch-battle-report", oneOf([body("avatarID").isNumeric().optional({ nullable: true, checkFalsy: true }), body("owner").isEmail().optional({ nullable: true, checkFalsy: true })]), authenticateJWT, async (req: TypedRequestBody<Pick<FetchBattleReportBody, "avatarID" | "owner">>, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - POST /fetch-battle-report");
  }

  // Can now get latest BR by either avatarID or email(owner)
  const { avatarID } = req.body;
  const column = avatarID ? "avatarID" : "owner";

  try {
    const battleReport: HF.Battle = await Battle.findOne({ limit: 1, where: { [column]: req.body[column], [Op.not]: { outcome: "TBD" } }, order: [["createdAt", "DESC"]], raw: true });

    // No Results, may be new user or have already seen report (shouldn't happen)
    if (!battleReport || battleReport.seenReport) {
      return res.formatter.ok({ result: null });
    }

    // Figure out which season it is, so a 25% bonus can be given to BRA & BRF
    const { determineAstrologySeason } = avCalc();
    battleReport.seasonalBonusElement = determineAstrologySeason(battleReport.updatedAt);

    // If the avatar won, Get the items acquired from the action types in the battle report
    if (battleReport.outcome === "Avatar Wins" && battleReport.postBattleActions) {
      const items: HF.Item[] = await Items.findAll({ attributes: ["type", "name", "description", "lore", "effects", "icon", "class", "exhaustible", "ptCost", "action"], where: { action: { [Op.in]: battleReport.postBattleActions } } });
      battleReport.itemsAcquired = items;

      return res.formatter.ok({ result: battleReport }, "Retrieved Latest Battle Results");
    }

    res.formatter.ok({ result: battleReport }, "Retrieved Latest Battle Results");
  } catch (error) {
    res.formatter.serverError(error.toString(), "No Battle Results for /fetch-battle-report Endpoint");
  }
});

// Anyone clicks on a battle from anyone's profile page
router.post("/fetch-battle-report-by-id", body("id").isNumeric(), async (req: TypedRequestBody<{ id: number }>, res: Response) => {
  const { id } = req.body;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - POST /fetch-battle-report-by-id");
  }

  try {
    const battle = await Battle.findOne({ where: { id }, raw: true });

    // IF the avatar won, Get the items acquired from the action types in the battle report, otherwise set items to null
    const items = battle.outcome === "Avatar Wins" && battle.postBattleActions ? await Items.findAll({ attributes: ["type", "name", "description", "lore", "effects", "icon", "class", "exhaustible", "ptCost", "action"], where: { action: { [Op.in]: battle.postBattleActions } } }) : null;
    battle.itemsAcquired = items;

    // Need correct Skin to show the user in the battle report modal on the Profile Page
    const skinItemInstance = await AvatarItems.findOne({ attributes: ["itemID", "avatarID"], where: { avatarID: id, equipped: true }, raw: true });
    battle.avatarSkin = skinItemInstance;

    // Figure out which season it is, so a 25% bonus can be given to BRA & BRF
    const { determineAstrologySeason } = avCalc();
    const startedTrackingSeasons = moment("2021-03-04", "YYYY-MM-DD");
    const battleDate = moment(battle.createdAt);
    battle.seasonalBonusElement = battleDate && battleDate.isAfter(startedTrackingSeasons) ? determineAstrologySeason(battle.updatedAt) : null;

    res.formatter.ok({ adjResult: battle });
  } catch (error) {
    res.formatter.serverError(error.toString(), "No Results for /fetch-battle-report-by-id Endpoint");
  }
});

// USER sees a battle report, mark it so in the database
router.post("/update-battle-report-seen", body("id").isNumeric(), authenticateJWT, async (req: TypedRequestBody<{ id: number }>, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - POST /update-battle-report-seen");
  }

  try {
    await Battle.update({ seenReport: true }, { where: { id: req.body.id } });
    res.formatter.ok({ message: "Successfully updated seenReport" });
  } catch (error) {
    console.log("couldn't update seen by", error);
    res.formatter.serverError(error.toString(), "Failed to update seenReport");
  }
});

// USER opens upcoming battle window after having already gone
router.post("/fetch-upcoming-foe-and-rewards", body("avatarID").isNumeric(), authenticateJWT, async (req: TypedRequestBody<{ avatarID: number }>, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - POST /fetch-upcoming-foe-and-rewards");
  }
  const { avatarID } = req.body;

  try {
    const battle = await Battle.findOne({ where: { avatarID, outcome: "TBD" }, raw: true, attributes: ["foe", "postBattleActions"] });

    if (!battle) {
      throw new Error("No battles on record");
    }

    let rewards: string[] = [];
    // No PBAs, just return foe and rewards(empty array)
    if (!battle.postBattleActions) {
      return res.formatter.ok({ foe: battle.foe, rewards });
    }

    // Get the items acquired from the action types in the battle report
    rewards = battle.postBattleActions.map((action: PBAType) => {
      let matchingPBA: AllPbaTypes;

      for (let actionType in ALLPBAs as PostBattleActions) {
        // Can't figure out this type error... I know this works
        const match: AllPbaTypes = ALLPBAs[actionType as keyof PostBattleActions].find((pba: AllPbaTypes) => {
          return pba.action === action;
        });
        if (match) {
          matchingPBA = match;
          break;
        }
      }

      return matchingPBA.name;
    });

    // No Rewards found from PBAs, just return foe and rewards(null)
    if (!rewards.length) {
      return res.formatter.ok({ foe: battle.foe, rewards });
    }

    // Find Item templates in DB that match awarded items
    const matchingItems: HF.Item[] = await Items.findAll({
      attributes: ["type", "name", "description", "lore", "effects", "icon", "class", "exhaustible", "ptCost", "action"],
      where: { name: { [Op.in]: rewards } },
    });

    return res.formatter.ok({ foe: battle.foe, rewards: matchingItems });
  } catch (error) {
    res.formatter.serverError(error.toString(), `Couldn't retrieve foe for upcoming battle! No Battle Record listed. USER - ${avatarID}`);
  }
});

// Retrieve list of Villains for Campaign page
router.get("/villain-list", (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - GET /villain-list");
  }

  if (villains) {
    res.formatter.ok({ villains });
  } else {
    const error = new Error("No battles on record");
    res.formatter.serverError(error.toString(), "Couldn't retrieve villain list");
  }
});

// Fetch battles won by a particular hero for Campaign page
router.post("/fetch-battles-won-or-dko", body("avatarID").isNumeric(), authenticateJWT, async (req: TypedRequestBody<{ avatarID: number }>, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - POST /fetch-battles-won");
  }

  try {
    const battles: HF.Battle[] = await Battle.findAll({ where: { avatarID: req.body.avatarID, [Op.or]: [{ outcome: "Avatar Wins" }, { outcome: "Double KO" }] }, raw: true, attributes: ["outcome", "foe"] });

    res.formatter.ok({ battles });
  } catch (error) {
    res.formatter.serverError(error.toString(), "Retrieved Data Error for /fetch-battles-won");
  }
});

// Runs one specific battle... currently only used if a battle fails
router.post("/run-specific-battle", body("avatarID").isNumeric(), authenticateJWT, async (req: TypedRequestBody<{ avatarID: number }>, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - POST /run-specific-battle");
  }

  let { avatarID } = req.body;

  try {
    const battle: HF.Battle = await Battle.findOne({ where: { outcome: "TBD", avatarID }, raw: true });
    if (!battle) {
      throw new Error("No Battle");
    }

    const data = await battleProcess(battle, battle.avatar);
    res.formatter.ok(data);
  } catch (error) {
    if (error.toString() === "Error: No Battle") {
      return res.formatter.badRequest(errors.array(), `No TBD battle matching avatarID ${avatarID} - POST /run-specific-battle`);
    }
    res.formatter.serverError(error.toString(), "Retrieved Data Error for /run-specific-battle");
  }
});

export default router;
