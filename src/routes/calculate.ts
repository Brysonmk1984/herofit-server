import express, { Response } from "express";
import { body, validationResult } from "express-validator";
import { authenticateJWT } from "../jwt/validateJWT";
import avCalc from "../game/upgrades/avCalc";
import xpCalc from "../game/upgrades/xpCalc";
import { TypedRequestBody } from "../types/BackendOnlyTypes";
import { sendBackendOnlyEmail } from "../mail";
const router = express.Router();

router.post("/fetch-astrology-season", body("date").isDate().optional({ nullable: true }), (req: TypedRequestBody<{ date: string }>, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for /fetch-astrology-season");
  }

  const { determineAstrologySeason } = avCalc();
  const { sign, element } = determineAstrologySeason(req.body.date);

  if (sign && element) {
    res.formatter.ok({ sign, element });
  } else {
    const error = new Error("Sign or element couldn't be determined");
    sendBackendOnlyEmail("Couldn't Determine Astrology Season", error);
    res.formatter.serverError(error.toString());
  }
});

router.post("/fetch-current-level-by-input", body("xp").isNumeric(), authenticateJWT, (req: TypedRequestBody<{ xp: number }>, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for /fetch-current-level-by-input");
  }

  const xp = req.body.xp;
  const { currentLevelByInput } = xpCalc(xp, 0);
  const levelObj = currentLevelByInput(xp);

  if (levelObj) {
    res.formatter.ok(levelObj);
  } else {
    const error = new Error("Current Level is Falsy");
    sendBackendOnlyEmail("Determine hero Level error", error);
    res.formatter.serverError(error.toString());
  }
});

router.post("/fetch-next-level-xp-by-input", body("level").isNumeric(), authenticateJWT, (req: TypedRequestBody<{ level: number }>, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for /fetch-next-level-xp-by-input");
  }

  const level = req.body.level;
  const { nextLevelByInput } = xpCalc();
  const nextLevelXp = nextLevelByInput(level);

  if (nextLevelXp) {
    res.formatter.ok({ nextLevelXp });
  } else {
    const error = new Error("Next Level up is falsy");
    sendBackendOnlyEmail("Determine hero Level up error", error);
    res.formatter.serverError(error.toString());
  }
});

interface CheckLevelUpByInputBody {
  startingXP: number;
  endingXP: number;
}

router.post("/check-level-up-by-input", body("startingXP").isNumeric(), body("endingXP").isNumeric(), authenticateJWT, (req: TypedRequestBody<CheckLevelUpByInputBody>, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for /check-level-up-by-input");
  }
  const { startingXP, endingXP } = req.body;
  const { checkLevelUpByInput } = xpCalc();
  const levelUpObj = checkLevelUpByInput(startingXP, endingXP);

  if (levelUpObj) {
    const { leveledUp, levels } = levelUpObj;
    res.formatter.ok({ leveledUp, levels });
  } else {
    const error = new Error("Level Up obj is falsy, should be an object containing levelUps and levels");
    sendBackendOnlyEmail("Unable to check level ups by input", error);
    res.formatter.serverError(error.toString());
  }
});

export default router;
