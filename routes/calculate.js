const express = require("express");
const { body, validationResult } = require("express-validator");
const { authenticateJWT } = require("../jwt/validateJWT");
const router = express.Router();
const avCalc = require("../game/upgrades/avCalc");
const xpCalc = require("../game/upgrades/xpCalc");

router.post(
  "/fetch-astrology-season",
  body("date").isDate().optional({ nullable: true }),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.formatter.badRequest(
        errors.array(),
        "Validation Error - for /fetch-astrology-season"
      );
    }

    const { determineAstrologySeason } = avCalc();
    const { sign, element } = determineAstrologySeason(req.body.date);

    if (sign && element) {
      res.formatter.ok({ sign, element });
    } else {
      res.serverError("Couldn't Determine Astrology Season");
    }
  }
);

router.post(
  "/fetch-current-level-by-input",
  body("xp").isNumeric(),
  authenticateJWT,
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.formatter.badRequest(
        errors.array(),
        "Validation Error - for /fetch-current-level-by-input"
      );
    }

    const xp = req.body.xp;
    const { currentLevelByInput } = xpCalc();
    const levelObj = currentLevelByInput(xp);

    if (levelObj) {
      res.formatter.ok(levelObj);
    } else {
      res.formatter.serverError("Current level is falsy");
    }
  }
);

router.post(
  "/fetch-next-level-xp-by-input",
  body("level").isNumeric(),
  authenticateJWT,
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.formatter.badRequest(
        errors.array(),
        "Validation Error - for /fetch-next-level-xp-by-input"
      );
    }

    const level = req.body.level;
    const { nextLevelByInput } = xpCalc();
    const nextLevelXp = nextLevelByInput(level);

    if (nextLevelXp) {
      res.formatter.ok({ nextLevelXp });
    } else {
      res.formatter.serverError("Next Level up is falsy");
    }
  }
);

router.post(
  "/check-level-up-by-input",
  body("startingXP").isNumeric(),
  body("endingXP").isNumeric(),
  authenticateJWT,
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.formatter.badRequest(
        errors.array(),
        "Validation Error - for /check-level-up-by-input"
      );
    }
    const { startingXP, endingXP } = req.body;
    const { checkLevelUpByInput } = xpCalc();
    const { leveledUp, levels } = checkLevelUpByInput(startingXP, endingXP);

    res.formatter.ok({ leveledUp, levels });
  }
);

module.exports = router;
