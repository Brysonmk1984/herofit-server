import express, { Response } from "express";
import { body, validationResult } from "express-validator";
import { authenticateJWT } from "../jwt/validateJWT";
import { User, Avatar, AvatarItems, Battle, UserActivity, UserTotal } from "../config/db";
import moment, { Moment } from "moment";
import xpCalc from "../game/upgrades/xpCalc";
import { Op } from "sequelize";
import { config } from "../appConfig";
import { parseActivityData } from "../lib/helperFunctions";
import { ObjectWithAnyProperties, TypedRequestBody, UserTotals } from "../types/BackendOnlyTypes";
import HF from "../types/herofit";
const router = express.Router();

// If an email is passed, get that user, otherwise get user based on JWT
router.post("/user-details", body("email").isEmail().optional({ nullable: true, checkFalsy: true }), authenticateJWT, async (req: TypedRequestBody<{ email: string }>, res: Response) => {
  if (config.mode === "maintenance") {
    return res.formatter.serviceUnavailable("Server is down for maintenance, please try again later...");
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for GET /user");
  }
  const { email } = req.body;
  const requestUser = req.user;

  try {
    const user: HF.User = await User.findOne({ where: email ? { email } : { id: requestUser.id }, raw: true });

    if (!user) {
      return res.formatter.unauthorized(`Couldn't find a user with that email.`);
    }

    interface UserDetailsResponse {
      user: HF.User;
      globalMessage?: HF.GlobalMessage[];
    }

    const response: UserDetailsResponse = { user };
    // For initial load, also return any global message
    if (config.globalMessage && config.globalMessage.length) {
      response.globalMessage = config.globalMessage;
    }

    return res.formatter.ok(response);
  } catch (error) {
    console.log("Passport Auth error - ", error);
    res.formatter.serverError(error.toString(), `Error Logging in User - for GET /user`);
  }
});

interface InstantiateUserTotalsBody {
  email: string;
  avatarId: number;
}

// Initialize the user_totals instance for a new user
router.post("/instantiate-user-totals", body("email").isEmail(), body("avatarId").isNumeric(), authenticateJWT, async (req: TypedRequestBody<InstantiateUserTotalsBody>, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for POST /instantiate-user-totals Endpoint");
  }
  const { email, avatarId } = req.body;

  try {
    const [resultObj, created]: [ObjectWithAnyProperties, boolean] = await UserTotal.findOrCreate({ where: { user: email }, defaults: { user: email, avatarId }, raw: true });
    const results: UserTotals = resultObj.dataValues;

    // New user_total Created
    if (created) {
      res.formatter.ok({ results });
      // Updated Existing Avatar
    } else if (!created) {
      res.formatter.ok({ results });
    } else {
      throw new Error("Couldn't Instantiate user totals.");
    }
  } catch (error) {
    console.log(`Error Instantiating user total for ${email}, DEBUG: ${error}`);
    res.formatter.serverError(error.toString(), `Error Instantiating user total for ${email} - POST /instantiate-user-totals Endpoint`);
  }
});

interface GetUserActivitiesBody {
  email: string;
  count?: number;
}

// Get all user activities by email - used only for the logged in user
// Count is used in the App to only fetch latest 10. Might make this the standard in web version too in the future instead of getting 250
router.post("/get-user-activities", body("email").isEmail(), body("count").isNumeric().optional(), authenticateJWT, async (req: TypedRequestBody<GetUserActivitiesBody>, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for POST /get-user-activities Endpoint");
  }
  const { email, count } = req.body;

  try {
    const results: HF.Activity[] = await UserActivity.findAll({
      where: { user: email },
      raw: true,
      limit: count ? count : 250,
      order: [["activityDate", "DESC"]],
      attributes: ["id", "type", "duration", "distance", "source", "averageSpeed", "maxSpeed", "elevationGain", "activityDate"],
    });

    if (!results.length) {
      return res.formatter.ok({ activities: null });
    }

    const activities: HF.Activity[] = [];
    // Only concerned with non-manual activities for determining latestActivityDate
    // since latestActivityDate is only used for Data fetching
    const nonHerofitDatesArray: Moment[] = [];

    results.forEach(result => {
      activities.push(parseActivityData(result));
      if (result.source !== "herofit") {
        nonHerofitDatesArray.push(moment(result.activityDate));
      }
    });

    // Only used in case there are no non-herofit activities within the last 30 activities
    const allActDateArray = activities.map(act => moment(act.activityDate));
    // Use latest non manual herofit date for maxDate, or if there are no non-manual activitities, use the OLDEST manual date
    // This way, we're most likely to not miss any activities fetched from dataSrc without doing a more complicated query to look up older non manual activities

    const maxDate = nonHerofitDatesArray.length ? moment.utc(moment.max(nonHerofitDatesArray), "YYYY-MM-DD HH:mm:ss") : moment.utc(moment.min(allActDateArray), "YYYY-MM-DD HH:mm:ss");
    res.formatter.ok({ activities, latestActivityDate: maxDate });
  } catch (error) {
    console.log(`Error getting saved user activities for ${email}, DEBUG : ${error}`);
    res.formatter.serverError(error.toString(), `Error getting saved user activities for ${email} - POST /get-user-activities Endpoint`);
  }
});

// PROFILE PAGE
// Initial page load of profile page, uses username as a parameter
router.post("/get-profile-info-by-email", body("heroName").isString(), async (req: TypedRequestBody<{ heroName: string }>, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for POST /get-info-by-username Endpoint");
  }
  const { heroName } = req.body;

  let email, userTotals, activities, avatar, battles;

  try {
    const hero: (HF.Hero & { ownerUserName: string }) | null = await Avatar.findOne({ where: { name: heroName }, raw: true });

    if (!hero) {
      return res.formatter.ok({ noUser: true });
    }

    email = hero.owner;
    avatar = hero;

    // First, exchange the username for the email
    type PromiseReturnTuple = [Promise<UserTotals>, Promise<HF.Activity[]>, Promise<HF.Battle[]>, Promise<HF.User>];
    const allPromises: PromiseReturnTuple = [
      UserTotal.findOne({
        where: { user: email },
        attributes: ["run", "hike", "walk", "ride", "weightTraining", "yoga", "stairStepper", "elliptical", "swim", "rowing", "crossfit", "standUpPaddling", "workout", "ski", "snowboard", "snowshoe", "kayaking"],
        raw: true,
      }),
      UserActivity.findAll({
        where: { user: email },
        raw: true,
        limit: 10,
        order: [["activityDate", "DESC"]],
        attributes: ["id", "type", "duration", "source", "distance", "averageSpeed", "maxSpeed", "elevationGain", "activityDate"],
      }),
      Battle.findAll({
        where: { owner: email },
        raw: true,
        limit: 50,
        order: [["createdAt", "DESC"]],
      }),
      User.findOne({
        where: { email },
        attributes: ["username"],
        raw: true,
      }),
    ];

    const [ut, act, bat, user] = await Promise.all(allPromises);

    userTotals = ut;
    activities = act.map(a => parseActivityData(a));
    battles = bat;

    avatar.ownerUserName = user.username;
    const itemInstances = await AvatarItems.findAll({ where: { avatarID: avatar.id }, raw: true });

    const { currentLevelByInput } = xpCalc();
    const { level, albedo } = currentLevelByInput(avatar.activityXP + avatar.battleXP);
    avatar.level = level;
    avatar.albedo = albedo;

    res.formatter.ok({
      userTotals,
      activities,
      avatar,
      battles,
      itemInstances,
    });
  } catch (error) {
    console.log("Error - ", error);
    res.formatter.serverError(error.toString(), `Error retrieving data for ${email} - POST /get-profile-info-by-email Endpoint`);
  }
});

// User performs a search on the profile page, brings up all users and avatars by that name
router.post("/get-matching-users", body("searchInput").isString(), async (req: TypedRequestBody<{ searchInput: string }>, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for POST /get-matching-users Endpoint");
  }
  const { searchInput } = req.body;
  const allPromises: Promise<any>[] = [];

  allPromises.push(
    Avatar.findAll({
      where: { name: { [Op.iLike]: `%${searchInput}%` } },
    }),
    User.findAll({
      where: { username: { [Op.iLike]: `%${searchInput}%` } },
    }),
  );

  try {
    const [avatarObj, userObj] = await Promise.allSettled<ObjectWithAnyProperties[]>(allPromises);

    // If either the Avatar search or User search Promise is rejected, throw error
    if (avatarObj.status === "rejected") {
      throw avatarObj.reason;
    } else if (userObj.status === "rejected") {
      throw userObj.reason;
    }

    const userList = [avatarObj.value, userObj.value];
    res.formatter.ok({ userList });
  } catch (error) {
    console.log("Error - ", error);
    res.formatter.serverError(error.toString(), `Error retrieving list for query  ${searchInput} - POST /get-matching-users Endpoint`);
  }
});

// After a user searches for a user, they click an email from the list. Load selected user
router.post("/get-hero-name-by-username", body("username").isString(), async (req: TypedRequestBody<{ username: string }>, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for POST /get-hero-name-by-username Endpoint");
  }
  const { username } = req.body;

  try {
    const user: { name: string } = await User.findOne({ where: { username }, attributes: ["email"], raw: true });
    res.formatter.ok({ name: user.name });
  } catch (error) {
    console.log("Error - ", error);
    res.formatter.serverError(error.toString(), `Error retrieving username for  user ${username} - POST /get-hero-name-by-username Endpoint`);
  }
});

module.exports = router;
