import express from "express";
import { body, validationResult } from "express-validator";
import { authenticateJWT } from "../jwt/validateJWT";
import { Avatar, User, Battle, AvatarItems } from "../config/db";
import { TypedRequestBody } from "../types/BackendOnlyTypes";
const router = express.Router();

// UPDATE HERO NAME
router.post("/update-avatar-name", body("owner").isEmail(), body("newHeroName").isString().isLength({ min: 3, max: 25 }), authenticateJWT, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for /update-avatar-name endpoint");
  }
  const { newHeroName, owner } = req.body;

  try {
    const result = Avatar.update({ name: newHeroName }, { where: { owner }, returning: true });

    if (result[0]) {
      return res.formatter.ok({ updatedName: result[1][0].name });
    } else {
      throw new Error("No Avatar Result");
    }
  } catch (error) {
    console.log("Error updating name - ", error);
    res.formatter.serverError(error.toString(), "Unable to update avatar name - for /update-avatar-name endpoint");
  }
});

// UPDATE USERNAME
router.post("/update-owner-username", body("owner").isEmail(), body("newUsername").isString().isLength({ min: 3, max: 25 }), authenticateJWT, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for /update-owner-username endpoint");
  }
  const { newUsername, owner } = req.body;

  try {
    const result = User.update({ username: newUsername }, { where: { email: owner }, returning: true });
    if (result[0]) {
      return res.formatter.ok({ updatedUsername: result[1][0].username });
    } else {
      throw new Error("Unable to update Record");
    }
  } catch (error) {
    console.log("Error updating name - ", error);
    res.formatter.serverError(error.toString(), "Unable to update username - for /update-owner-username endpoint");
  }
});

interface DeleteAccountBody {
  username: string;
  email: string;
  avatarID: number;
}

// DELETE ACCOUNT
router.delete("/:username", body("username").isString(), body("email").isEmail(), body("avatarID").isNumeric(), authenticateJWT, async (req: TypedRequestBody<DeleteAccountBody>, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for DELETE /:username");
  }

  // If deleting from the admin panel, use data from the body, otherwise from the passed in user token
  const { id, email } = req.user;
  const { avatarID } = req.body;

  try {
    const promises = [];
    promises.push(AvatarItems.destroy({ where: { avatarID } }));
    promises.push(Battle.destroy({ where: { owner: email } }));

    await Promise.allSettled(promises);
    await Avatar.destroy({ where: { owner: email } });
    await User.destroy({ where: { id } });
    res.formatter.ok({ message: "Successfully deleted account!" });
  } catch (error) {
    console.log(error);
    return res.formatter.serverError(error.toString(), `Unable to delete account for user ${email}, - DELETE /:username endpoint`);
  }
});

interface DeleteAccountByEmailBody {
  id: number;
  username: string;
  email: string;
  avatarID: number;
}
// DELETE ACCOUNT
router.delete("/:email", body("id").isNumeric().optional({ nullable: true, checkFalsy: true }), body("username").isString(), body("email").isEmail(), body("avatarID").isNumeric(), authenticateJWT, async (req: TypedRequestBody<DeleteAccountByEmailBody>, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for DELETE /:username");
  }

  // If deleting from the admin panel, use data from the body, otherwise from the passed in user token
  const { id, email } = req.user;
  const { avatarID } = req.body;

  try {
    const promises = [];
    promises.push(AvatarItems.destroy({ where: { avatarID } }));
    promises.push(Battle.destroy({ where: { owner: email } }));

    await Promise.allSettled(promises);
    await Avatar.destroy({ where: { owner: email } });
    await User.destroy({ where: { id } });
    res.formatter.ok({ message: "Successfully deleted account!" });
  } catch (error) {
    console.log(error);
    return res.formatter.serverError(error.toString(), `Unable to delete account for user ${email}, - DELETE /:username endpoint`);
  }
});

/* 
  MOBILE APP ONLY
*/

interface ToggleMetricSystemBody {
  isMetric: boolean;
  email: string;
}

router.put("/toggle-metric-system", body("isMetric").isBoolean(), body("email").isEmail(), authenticateJWT, async (req: TypedRequestBody<ToggleMetricSystemBody>, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for /toggle-metric-system");
  }
  const { isMetric, email } = req.body;

  try {
    const result = await User.update({ isMetric }, { where: { email }, returning: true });
    return res.formatter.ok({
      user: result[1][0],
      message: `Successfully toggled ${isMetric ? "Metric system" : "Imperial system"} on!`,
    });
  } catch (error) {
    return res.formatter.serverError(error.toString(), `Unable to toggle metric/imperial system mode for ${email}, - PUT /toggle-metric-system endpoint`);
  }
});

module.exports = router;
