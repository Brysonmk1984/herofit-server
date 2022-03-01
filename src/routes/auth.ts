import express, { Response } from "express";
import { body, validationResult } from "express-validator";
import { authenticateJWT } from "../jwt/validateJWT";
import issueJWT from "../jwt/issueJWT";
import { User } from "../config/db";
import { config } from "../appConfig";
import latestPatchDetails from "../patchDetails/latest.json";
import { genPassword, validatePassword } from "../lib/passwordUtils";
import { randomEmailString, usePasswordHashToMakeToken } from "../lib/passwordUtils";
import { sendVerificationEmail, sendResetPasswordEmail, sendBackendOnlyEmail } from "../mail";
import axios from "axios";
// mobile app only
import heroList from "../heroList.json";
import crypto from "crypto";
import { Op } from "sequelize";
import { TypedRequestBody } from "../types/BackendOnlyTypes";
import HF from "../types/herofit";

const router = express.Router();

interface LoginBody {
  email: string;
  password: string;
}
router.post("/login", body("email").isEmail(), body("password").isString().isLength({ min: 8, max: 25 }), async (req: TypedRequestBody<LoginBody>, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for POST /login");
  }
  if (config.mode === "maintenance") {
    return res.formatter.serviceUnavailable("Server is down for maintenance, please try again later...");
  }
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ where: { email: { [Op.iLike]: email } }, raw: true });
    if (!user) {
      return res.formatter.unauthorized(`Couldn't find a user with that email.`);
    } else if (!user.hash) {
      return res.formatter.unauthorized({
        oldUserMigration: true,
        message: "HeroFit has upgraded to a new login system. Please verify your account.",
      });
    }

    const isValid = validatePassword(password, user.hash, user.salt);
    if (isValid) {
      const tokenObject = issueJWT(user);
      return res.formatter.ok({ user, tokenObject });
    } else {
      return res.formatter.unauthorized(`Incorrect password, please try again.`);
    }
  } catch (error) {
    console.log("Passport Auth error - ", error);
    res.formatter.serverError(error.toString(), `Error Logging in User - for POST /login`);
  }
});

interface RegisterBody {
  email: string;
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
  hash: string;
  salt: string;
  emailCode: string;
  emailMarketingOptIn: boolean;
  isMetric: boolean;
  foundOutBy: string | null;
  referredBy?: string;
  isMobileApp: boolean;
}
// captchaValue is optional since App isn't using it
// * TURNS OUT, passing null to something optional will still trigger an error unless "{nullable: true, checkFalsy: true}" is passed in
router.post("/register", body("email").isEmail(), body("firstName").isString(), body("username").isString().isLength({ min: 3, max: 25 }), body("password").isString().isLength({ min: 8, max: 25 }), body("emailMarketingOptIn").isBoolean(), body("isMetric").isBoolean(), body("foundOutBy").isString().optional({ nullable: true }), body("referredBy").isString().optional({ nullable: true }), body("isMobileApp").isBoolean().optional({ nullable: true, checkFalsy: true }), async (req: TypedRequestBody<RegisterBody>, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    sendBackendOnlyEmail("Couldn't Register - validation error!", JSON.stringify(errors));
    return res.formatter.badRequest(errors.array(), "Validation Error - for POST /register");
  }

  if (config.mode === "maintenance") {
    return res.formatter.serviceUnavailable("Server is down for maintenance, please try again later...");
  }

  let { email, username, password, firstName, lastName, emailMarketingOptIn, isMetric, foundOutBy, referredBy, isMobileApp } = req.body;
  firstName = firstName || null;
  lastName = lastName || null;
  const saltHash = genPassword(password);
  const { salt, hash } = saltHash;
  const emailCode = randomEmailString();

  const newUser = {
    email,
    username,
    firstName,
    lastName,
    hash,
    salt,
    emailCode,
    emailMarketingOptIn,
    isMetric,
    foundOutBy,
    referredBy,
  };

  try {
    const result = await User.create(newUser);

    // Not sure why sequelize can't do raw : true, so we need this:
    const user = result.get({ plain: true });
    const tokenObject = issueJWT(user);

    interface ResponseData {
      user: RegisterBody;
      tokenObject: {
        token: string;
        expiresIn: string;
      };
      globalMessage?: HF.GlobalMessage[];
    }

    const response: ResponseData = { user, tokenObject };
    if (config.globalMessage && config.globalMessage.length) {
      response.globalMessage = config.globalMessage;
    }

    await sendVerificationEmail(email, emailCode, isMobileApp);
    return res.formatter.ok(response);
  } catch (error) {
    console.log(`Couldn't create user ${email}, DEBUG: ${error}`);
    const uniqueConstraint = `SequelizeUniqueConstraintError: Validation error`;
    if (error.toString() === uniqueConstraint) {
      const emailTakenMessage = "That email is already in use. Have you already registered? Try logging in instead.";
      return res.formatter.badRequest(emailTakenMessage, `Email already in use ${email} - for POST /register`);
    }
    sendBackendOnlyEmail("Couldn't Register!", JSON.stringify(error));
    res.formatter.serverError(error.toString(), `Couldn't create user ${email} - for POST /register`);
  }
});

interface ResetPasswordConfirmEmailBody {
  email: string;
  isMobileApp: boolean;
}

// FOR BOTH PASSWORD RESET AND LEGACY ACCOUNTS CONFIRMING EMAIL
router.post("/reset-password-confirm-email", body("email").isEmail(), body("isMobileApp").isBoolean().optional(), async (req: TypedRequestBody<ResetPasswordConfirmEmailBody>, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    sendBackendOnlyEmail("Couldn't send reset password email - validation error!", JSON.stringify(errors));
    return res.formatter.badRequest(errors.array(), "Validation Error - for POST /reset-password-confirm-email");
  }
  const { email, isMobileApp } = req.body;

  try {
    const user = User.findOne({ where: { email }, attributes: ["email", "hash", "createdAt"], raw: true });
    if (user) {
      const token = usePasswordHashToMakeToken(user);
      const result = await sendResetPasswordEmail(email, token, isMobileApp);
      return res.formatter.ok({ result });
    } else {
      return res.formatter.badRequest("No matching email.");
    }
  } catch (error) {
    sendBackendOnlyEmail("Couldn't send reset password email - server error!", JSON.stringify(error));
    res.formatter.serverError(error.toString(), "Server Error - for POST /reset-password-confirm-email");
  }
});

router.post("/reset-password", body("email").isEmail(), body("token").isString(), body("password").isString({ min: 8, max: 25 }), (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    console.log("INVALIDATION ERROR");
    sendBackendOnlyEmail("Couldn't Reset Password - validation error!", JSON.stringify(errors));
    return res.formatter.badRequest(errors.array(), "Validation Error - for POST /reset-password");
  }
  const { email, token, password } = req.body;
  // Can theoretically change someone elses email... figure out a better way in the future
  return User.findOne({
    where: { email },
    attributes: ["email", "hash", "createdAt", "active", "emailCode"],
    raw: true,
  })
    .then(result => {
      if (result) {
        const { active, emailCode } = result;
        const saltHash = genPassword(password);
        const { salt, hash } = saltHash;
        const updateObj = { salt, hash, active: true };

        // Legacy Users migrating to new Auth System
        if (!active && !emailCode) {
          console.log("IS LEGACY");
          updateObj.emailCode = "legacy-user";
        }

        return User.update(updateObj, { where: { email } })
          .then(result => {
            console.log("UPDATE RESULT!", result);
            return res.formatter.ok({
              message: "Successfully updated password",
            });
          })
          .catch(error => {
            console.log("ERROR", error);
            sendBackendOnlyEmail("Couldn't Reset Password - user update error!", JSON.stringify(error));
            return res.formatter.serverError(error.toString(), "Unable to update Password");
          });
      } else {
        console.log("Email doesn't match record in DB");
        return res.formatter.badRequest("No matching email.");
      }
    })
    .catch(error => {
      console.log("ERRROR", error);
      return new Promise((resolve, reject) => {
        return sendBackendOnlyEmail(
          {
            status: 777,
            message: `USER = ${email} Couldn't reset password`,
            debug: error,
            meta: "This is a bug with the last step of Forgot password, where user has already been returned to the app and submitted the update form. Something went wrong with the backend /reset-password route",
            version: "777",
            errorLocation: "backend - reset password / oldUserMigration",
          },
          resolve,
          reject,
        );
      })
        .catch(error => {
          console.log("email error", error);
        })
        .finally(() => {
          sendBackendOnlyEmail("Couldn't Reset Password - error finding user!", JSON.stringify(error));
          return res.formatter.serverError(error.toString());
        });
    });
});

// Used when user clicks "resend link" from "login" modal on web or from mobile app auth flow "ConfirmEmail" modal
router.post("/resend-email-confirmation", body("email").isEmail(), body("emailCode").isString().optional(), body("isMobileApp").isBoolean().optional(), (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors);
    sendBackendOnlyEmail("Couldn't Resend email confirmation - validation error!", JSON.stringify(errors));
    return res.formatter.badRequest(errors.array(), "Validation Error - for POST /resend-email-confirmation");
  }

  let { email, emailCode, isMobileApp } = req.body;

  function _handleSendEmailCode() {
    console.log("/resend-email-confirmation", email, emailCode);
    sendVerificationEmail(email, emailCode, isMobileApp)
      .then(data => {
        if (data.error) {
          return res.formatter.serverError(error.toString());
        }
        // emailCode returned for testing purposes only
        return res.formatter.ok({ emailCode });
      })
      .catch(error => {
        console.log("THE ERROR", error);
        sendBackendOnlyEmail("Couldn't Resend email confirmation - Error sending verification email!", JSON.stringify(error));
        return res.formatter.serverError(error.toString(), "SERVER Error - for POST /resend-email-confirmation");
      });
  }

  // If no emailCode, it means the user is trying to activate their account at a later date. In this case, generate a new emailCode since they don't have an emailCode saved in a JWT
  if (!emailCode) {
    emailCode = randomEmailString();
    console.log("UPDATING EMAIL CODE", emailCode);

    try {
      User.update({ emailCode }, { where: { email }, returning: true })
        .then(data => {
          if (data[0] === 0) {
            throw new Error("No Matching Email");
          }
          console.log("DDD", data);
          _handleSendEmailCode();
        })
        .catch(error => {
          console.log("email doesn't exist", error.toString());
          return res.formatter.badRequest(error.toString(), "CLIENT Error - for POST /resend-email-confirmation");
        });
    } catch (error) {
      return res.formatter.badRequest(error.toString(), "SERVER Error - for POST /resend-email-confirmation");
    }
  } else {
    _handleSendEmailCode();
  }
});

// VALIDATE EMAIL - User clicked a link in their email and were redirected to either the
// Oauth page or welcome page along with a 'verify' parameter containing a JWT of their password
// NOTE! - not used for forgot password or updating legacy accounts
router.post("/validated-email", body("emailCode").isString(), (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    sendBackendOnlyEmail("Couldn't update user after they clicked the email link and web site sent the email code - validation error!", JSON.stringify(errors));
    return res.formatter.badRequest(errors.array(), "Validation Error - for POST /validated-email");
  }

  const { emailCode } = req.body;
  //console.log("EC = ", emailCode);

  User.update({ active: true }, { where: { emailCode }, returning: true, plain: true })
    .then(data => {
      return res.formatter.ok({ user: data[1] });
    })
    .catch(error => {
      const errorString = error.toString();
      if (errorString === "TypeError: Cannot read properties of null (reading 'length')" || errorString === "TypeError: Cannot read property 'length' of null") {
        sendBackendOnlyEmail("Couldn't update user, after successfully clicking  the email link and website sent email code - no matching user", JSON.stringify(error));
        return res.formatter.badRequest(errorString, "CLIENT Error - for POST /validated-email");
      }
      console.log("ERROR WITH EMAIL CODE", error);
      sendBackendOnlyEmail("Couldn't update user, after successfully clicking  the email link and website sent email code", JSON.stringify(error));
      return res.formatter.serverError(errorString, "SERVER Error - for POST /validated-email");
    });
});

router.get("/strava-client-credentials", authenticateJWT, (req, res) => {
  res.formatter.ok({
    clientId: process.env.STRAVA_CLIENT_ID,
    clientSecret: process.env.STRAVA_CLIENT_SECRET,
    redirectUri: process.env.NODE_ENV === "production" ? process.env.STRAVA_REDIRECT_PROD : process.env.NODE_ENV === "staging" ? process.env.STRAVA_REDIRECT_STAGING : process.env.STRAVA_REDIRECT_DEV,
  });
});

router.post("/strava-credentials", body("email").isEmail(), body("stravaAccessToken").isString(), body("stravaAccessTokenExpiration").isNumeric(), body("stravaRefreshToken").isString(), body("dataSrcId").exists().optional(), authenticateJWT, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for /strava-credentials");
  }

  const { email, stravaAccessToken, stravaAccessTokenExpiration, stravaRefreshToken, dataSrcId } = req.body;

  const updateObj = {
    stravaAccessToken,
    stravaAccessTokenExpiration,
    stravaRefreshToken,
  };
  if (dataSrcId) {
    updateObj.dataSrcId = dataSrcId;
  }

  User.findOne({ where: { email } })
    .then(user => {
      // Check if record exists in db
      if (user) {
        User.update(updateObj, {
          where: { email },
          returning: true,
          plain: true,
        })
          .then(data => {
            res.formatter.ok({
              user: data[1],
            });
          })
          .catch(error => {
            console.log(`Couldn't update Strava tokens for user ${email}, DEBUG: ${error}`);

            const errorString = error.toString();
            console.log("ERR STR = ", errorString);
            // If dataSrcId is already in use, send bad request
            if (errorString === "SequelizeUniqueConstraintError: Validation error") {
              res.formatter.badRequest(errorString, `That Strava Account is Already in use! You can unlink a Strava Account from the Account Page of the other HeroFit account.`);
            } else {
              res.formatter.serverError(errorString, `Couldn't update Strava tokens for user ${email}`);
            }
          });
      } else {
        console.log("User not found!");
        const error = new Error("User not found!");
        res.formatter.serverError(error.toString());
      }
    })
    .catch(error => {
      console.log(`Couldn't find user ${email} to update their Strava, DEBUG: ${error}`);
      res.formatter.serverError(error.toString(), `Couldn't find user ${email}`);
    });
});

router.post("/disconnect-data-src", body("email").isEmail(), authenticateJWT, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for POST /disconnect-strava");
  }
  const { email } = req.body;

  User.update(
    {
      stravaAccessToken: null,
      stravaAccessTokenExpiration: null,
      stravaRefreshToken: null,
      dataSrcId: null,
    },
    { where: { email }, returning: true },
  )
    .then(result => {
      return res.formatter.ok({ user: result[1][0] });
    })
    .catch(error => {
      console.log(`Couldn't Disconnect Strava for account email ${email}`);
      res.formatter.serverError(error.toString(), "Database or server code error for POST /disconnect-strava");
    });
});

router.get("/fetch-latest-patch-details", authenticateJWT, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for /fetch-latest-patch-details");
  }

  if (!latestPatchDetails) {
    const error = new Error("There was a server error, please try again later");
    res.formatter.serverError(error.toString(), "Can't find latest Patch Details");
  }
  res.formatter.ok(latestPatchDetails);
});

router.post("/update-seen-latest-patch", body("id").isNumeric(), authenticateJWT, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for /update-seen-latest-patch");
  }

  const id = req.body.id;
  User.update({ seenLatestPatch: true }, { where: { id }, returning: true })
    .then(data => {
      res.formatter.ok({ data: "seen latest patch set to true" });
    })
    .catch(error => {
      console.log(`Couldn't update seenLatestPatch boolean for userID ${id}`);
      res.formatter.serverError(error.toString(), "Database or server code error for /update-seen-latest-patch");
    });
});

// MOBILE APP ONLY
router.get("/hero-list", (req, res) => {
  if (!heroList) {
    const error = new Error("Couldn't retrieve hero list!");
    return res.formatter.serverError(error.toString());
  }
  const heroListForApp = heroList.map(heroData => {
    return {
      character: heroData.character,
      alias: heroData.alias,
      description: heroData.description,
      history: heroData.history,
      image: heroData.image,
      elms: heroData.elms,
      colors: heroData.colors,
    };
  });
  res.formatter.ok(heroListForApp);
});

// If a user opts to do 'manual mode' instead of strava, use this endpoint to generate a dataSrcId
router.post("/generate-datasrcid", body("email").isEmail(), authenticateJWT, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for /non-strava-credentials");
  }

  const { email } = req.body;

  User.findOne({ where: { email } })
    .then(user => {
      // Check if record exists in db
      if (user) {
        User.update({ dataSrcId: `hf-${crypto.randomBytes(4).toString("hex")}` }, { where: { email }, returning: true, plain: true })
          .then(data => {
            res.formatter.ok({
              user: data[1],
            });
          })
          .catch(error => {
            console.log(`Couldn't update dataSrcId for user ${email}, DEBUG: ${error}`);
            const errorString = error.toString();
            console.log("ERR STR = ", errorString);
            // If dataSrcId is already in use, send bad request
            if (errorString === "SequelizeUniqueConstraintError: Validation error") {
              res.formatter.badRequest(errorString, `That dataSrcId is already in use!`);
            } else {
              res.formatter.serverError(errorString, `Couldn't update dataSrcId for user ${email}`);
            }
          });
      } else {
        console.log("User not found!");
        const error = new Error("User not found!");
        res.formatter.serverError(error.toString());
      }
    })
    .catch(error => {
      console.log(`Couldn't find user ${email} to update their Strava, DEBUG: ${error}`);
      res.formatter.serverError(error.toString(), `Couldn't find user ${email}`);
    });
});

router.get("/strava-client-credentials-app", authenticateJWT, (req, res) => {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const redirectUri = process.env.STRAVA_REDIRECT_APP;
  if (clientId && redirectUri) {
    return res.formatter.ok({
      clientId,
      redirectUri,
    });
  } else {
    const error = new Error("Missing credentials");
    res.formatter.serverError(error.toString());
  }
});

// Updating access token functionality moved here instead of the frontend for the app
router.post("/strava-fetch-and-update-access-token", body("email").isEmail(), authenticateJWT, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for /non-strava-credentials");
  }
  const { email, authCode } = req.body;

  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;

  try {
    const { stravaRefreshToken } = await User.findOne({
      where: { email },
      attributes: ["stravaRefreshToken"],
      raw: true,
    });
    const { data } = await axios.post(`https://www.strava.com/api/v3/oauth/token?client_id=${clientId}&client_secret=${clientSecret}&refresh_token=${stravaRefreshToken}&grant_type=refresh_token`, { withCredentials: true });
    const { access_token, refresh_token, expires_in } = data;
    const updateObj = {
      stravaAccessToken: access_token,
      stravaAccessTokenExpiration: expires_in,
      stravaRefreshToken: refresh_token,
    };

    // UPDATE DB WITH NEW STRAVA INFO
    const userData = await User.update(updateObj, {
      where: { email },
      returning: true,
      plain: true,
    });

    // If we are already saving the dataSrcId, then just return the user
    if (userData[1].dataSrcId) {
      res.formatter.ok({ user: userData[1] });
    } else {
      console.log("DOING OTHER STEP");
      //IF USER DATA DOES NOT INCLUDE A DATA SRC ID...
      // FETCH USER INFO TO GET STRAVA ID, WHICH WILL ALSO BE SAVED TO DB
      const { id: dataSrcId } = await axios.get(`https://www.strava.com/api/v3/athlete`, { headers: { Authorization: `Bearer ${access_token}` } });
      const finalUserData = await User.update({ dataSrcId }, { where: { email }, returning: true, plain: true });
      res.formatter.ok({
        user: finalUserData[1],
      });
    }
  } catch (error) {
    const errorString = error.toString();
    console.log("ERR STR = ", errorString);
    // If dataSrcId is already in use, send bad request
    if (errorString === "SequelizeUniqueConstraintError: Validation error") {
      res.formatter.badRequest(errorString, `That Strava Account is Already in use! You can unlink a Strava Account from the Account Page of the other HeroFit account.`);
    } else {
      res.formatter.serverError(errorString, `Couldn't update Strava tokens for user ${email}`);
    }
  }
});

// Connection Strava functionality moved here instead of the frontend for the app
router.post("/strava-first-time-auth-code-exchange", body("email").isEmail(), body("authCode").isString(), authenticateJWT, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for /non-strava-credentials");
  }
  const { email, authCode } = req.body;
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  try {
    // MUST EXCHANGE AUTH CODE FOR REFRESH ACCESS TOKENS
    const { data } = await axios.post(`https://www.strava.com/api/v3/oauth/token?client_id=${clientId}&client_secret=${clientSecret}&code=${authCode}&grant_type=authorization_code`, { withCredentials: true });
    const { access_token, expires_at, refresh_token } = data;
    const updateObj = {
      stravaAccessToken: access_token,
      stravaAccessTokenExpiration: expires_at,
      stravaRefreshToken: refresh_token,
    };

    // NEXT, FETCH USER INFO TO GET STRAVA ID, WHICH WILL ALSO BE SAVED TO DB
    const { data: userData } = await axios.get(`https://www.strava.com/api/v3/athlete`, { headers: { Authorization: `Bearer ${access_token}` } });
    updateObj.dataSrcId = userData.id;

    // LASTLY, UPDATE USER AND RETURN RESULT
    const finalUserData = await User.update(updateObj, {
      where: { email },
      returning: true,
      plain: true,
    });
    res.formatter.ok({
      user: finalUserData[1],
    });
  } catch (error) {
    const errorString = error.toString();
    console.log("ERR STR = ", errorString);
    // If dataSrcId is already in use, send bad request
    if (errorString === "SequelizeUniqueConstraintError: Validation error") {
      return res.formatter.badRequest(errorString, `That Strava Account is Already in use! You can unlink a Strava Account from the Account Page of the other HeroFit account.`);
    } else {
      return res.formatter.serverError(errorString, `Couldn't update Strava tokens for user ${email}`);
    }
  }
});

module.exports = router;
