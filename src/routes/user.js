const express = require("express");
const { body, validationResult } = require("express-validator");
const { authenticateJWT } = require("../jwt/validateJWT");
const router = express.Router();
const { User, Avatar, AvatarItems, Battle, UserActivity, UserTotal } = require("../config/db");
const moment = require("moment");
const xpCalc = require("../game/upgrades/xpCalc");
const { Op, col, literal } = require("sequelize");
const { config } = require("../appConfig");
const { parseActivityData } = require("../lib/helperFunctions");
const db = require("../config/db").db;

// If an email is passed, get that user, otherwise get user based on JWT
router.post("/user-details", body("email").isEmail().optional({ nullable: true, checkFalsy: true }), authenticateJWT, (req, res) => {
  if (config.mode === "maintenance") {
    return res.formatter.serviceUnavailable("Server is down for maintenance, please try again later...");
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors);
    return res.formatter.badRequest(errors.array(), "Validation Error - for GET /user");
  }
  const { email } = req.body;
  const user = req.user;

  User.findOne({ where: email ? { email } : { id: user.id }, raw: true })
    .then(user => {
      if (!user) {
        res.formatter.unauthorized(`Couldn't find a user with that email.`);
      }

      const response = { user };
      // For initial load, also return any global message
      if (config.globalMessage && config.globalMessage.length) {
        response.globalMessage = config.globalMessage;
      }

      return res.formatter.ok(response);
    })
    .catch(error => {
      console.log("Passport Auth error - ", error);
      res.formatter.serverError(error.toString(), `Error Logging in User - for GET /user`);
    });
});

// Initialize the user_totals instance for a new user
router.post("/instantiate-user-totals", body("email").isEmail(), body("avatarId").isNumeric(), authenticateJWT, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for POST /instantiate-user-totals Endpoint");
  }
  const { email, avatarId } = req.body;

  UserTotal.findOrCreate({
    where: {
      user: email,
    },
    // set the default properties
    defaults: {
      user: email,
      avatarId,
    },
    raw: true,
  })
    .then(result => {
      console.log("INSTANTIATION RESULT - ", result);
      const created = result[1];
      const results = result[0].dataValues;

      // New user_total Created
      if (created) {
        res.formatter.ok({ results });
        // Updated Existing Avatar
      } else if (!created) {
        res.formatter.ok({ results });
      } else {
        throw new Error("Couldn't Instantiate user totals.");
      }
    })
    .catch(error => {
      console.log(`Error Instantiating user total for ${email}, DEBUG: ${error}`);
      res.formatter.serverError(error.toString(), `Error Instantiating user total for ${email} - POST /instantiate-user-totals Endpoint`);
    });
});

// Get all user activities by email - used only for the logged in user
// Count is used in the App to only fetch latest 10. Might make this the standard in web version too in the future instead of getting 250
router.post("/get-user-activities", body("email").isEmail(), body("count").isNumeric().optional(), authenticateJWT, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for POST /get-user-activities Endpoint");
  }
  const { email, count } = req.body;

  UserActivity.findAll({
    where: { user: email },
    raw: true,
    limit: count ? count : 250,
    order: [["activityDate", "DESC"]],
    attributes: ["id", "type", "duration", "distance", "source", "averageSpeed", "maxSpeed", "elevationGain", "activityDate"],
  })
    .then(results => {
      if (results.length) {
        const activities = [];
        // Only concerned with non-manual activities for determining latestActivityDate
        // since latestActivityDate is only used for Data fetching
        const nonHerofitDatesArray = [];

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
        maxDate = nonHerofitDatesArray.length ? moment.utc(moment.max(nonHerofitDatesArray), "YYYY-MM-DD HH:mm:ss") : moment.utc(moment.min(allActDateArray), "YYYY-MM-DD HH:mm:ss");

        res.formatter.ok({ activities, latestActivityDate: maxDate });
      } else {
        res.formatter.ok({ activities: null });
      }
    })
    .catch(error => {
      console.log(`Error getting saved user activities for ${email}, DEBUG : ${error}`);
      res.formatter.serverError(error.toString(), `Error getting saved user activities for ${email} - POST /get-user-activities Endpoint`);
    });
});

// PROFILE PAGE
// Initial page load of profile page, uses username as a parameter
router.post("/get-profile-info-by-email", body("heroName").isString(), (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for POST /get-info-by-username Endpoint");
  }
  const { heroName } = req.body;

  let email, userTotals, activities, avatar, battles;
  // First, exchange the username for the email

  const allPromises = [];
  Avatar.findOne({ where: { name: heroName }, raw: true })
    .then(av => {
      if (!av) {
        return res.formatter.ok({ noUser: true });
      }

      email = av.owner;
      avatar = av;
      allPromises.push(
        UserTotal.findOne({
          where: { user: email },
          attributes: ["run", "hike", "walk", "ride", "weightTraining", "yoga", "stairStepper", "elliptical", "swim", "rowing", "crossfit", "standUpPaddling", "workout", "ski", "snowboard", "snowshoe", "kayaking"],
          raw: true,
        }),
      );
      allPromises.push(
        UserActivity.findAll({
          where: { user: email },
          raw: true,
          limit: 10,
          order: [["activityDate", "DESC"]],
          attributes: ["id", "type", "duration", "source", "distance", "averageSpeed", "maxSpeed", "elevationGain", "activityDate"],
        }),
      );
      allPromises.push(
        Battle.findAll({
          where: { owner: email },
          raw: true,
          limit: 50,
          order: [["createdAt", "DESC"]],
        }),
      );
      allPromises.push(
        User.findOne({
          where: { email },
          attributes: ["username"],
          raw: true,
        }),
      );
      return Promise.allSettled(allPromises);
    })
    .then(([ut, act, bat, user]) => {
      userTotals = ut;
      console.log("AACT", act.value);

      activities = act.value.map(a => {
        return parseActivityData(a);
      });
      console.log("done with acts!~", activities);
      battles = bat;
      avatar.ownerUserName = user.value.username;
      return AvatarItems.findAll({
        where: { avatarID: avatar.id },
        raw: true,
      });
    })
    .then(itemInstances => {
      userTotals = userTotals.value;
      battles = battles.value;
      const { currentLevelByInput } = xpCalc();
      const { level, albedo } = currentLevelByInput(avatar.activityXP + avatar.battleXP);
      avatar.level = level;
      avatar.albedo = albedo;
      console.log("ACTIVITIES", activities);
      res.formatter.ok({
        userTotals,
        activities,
        avatar,
        battles,
        itemInstances,
      });
    })
    .catch(error => {
      console.log("Error - ", error);
      res.formatter.serverError(error.toString(), `Error retrieving data for ${email} - POST /get-profile-info-by-email Endpoint`);
    });
});

// User performs a search on the profile page, brings up all users and avatars by that name
router.post("/get-matching-users", body("searchInput").isString(), (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for POST /get-matching-users Endpoint");
  }
  const { searchInput } = req.body;
  const allPromises = [];

  allPromises.push(
    Avatar.findAll({
      where: { name: { [Op.iLike]: `%${searchInput}%` } },
    }),
  );

  allPromises.push(
    User.findAll({
      where: { username: { [Op.iLike]: `%${searchInput}%` } },
    }),
  );

  Promise.allSettled(allPromises)
    .then(data => {
      const userList = [data[0].value, data[1].value];
      res.formatter.ok({ userList });
    })
    .catch(error => {
      console.log("Error - ", error);
      res.formatter.serverError(error.toString(), `Error retrieving list for query  ${searchInput} - POST /get-matching-users Endpoint`);
    });
});

// After a user searches for a user, they click an email from the list. Load selected user
router.post("/get-hero-name-by-username", body("username").isString(), (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for POST /get-hero-name-by-username Endpoint");
  }
  const { username } = req.body;
  User.findOne({ where: { username }, attributes: ["email"], raw: true })
    .then(user => {
      return Avatar.findOne({
        where: { owner: user.email },
        attributes: ["name"],
        raw: true,
      });
    })
    .then(data => {
      res.formatter.ok({ name: data.name });
    })
    .catch(error => {
      console.log("Error - ", error);
      res.formatter.serverError(error.toString(), `Error retrieving username for  user ${email} - POST /get-hero-name-by-username Endpoint`);
    });
});

/*
  MIGRATION
*/

// Write code to delete all bots
// router.get('/delete-bots', (req, res) => {

//   User.findAll(
//     {
//       include : [
//         { model: Avatar,  attributes: ['id'] },
//       ],
//       where : {
//         createdAt : {
//           [Op.gte]: moment("2021-08-27").toDate()
//         },
//         updatedAt : {
//           [Op.lte]: moment("2021-11-01").toDate()
//         },
//         latestActivityUpdate : null
//       },
//       raw : true
//     }
//   ).then((data) =>{
//     const emails = data.map(user => user.email);
//     const avatarIds = data.map(user => user['avatar.id']);
//     const userIds = data.map(user => user.id);

//     db.transaction(async t => {
//       try{
//         await AvatarItems.destroy({ transaction : t, where : { avatarID : {
//           [Op.in] : avatarIds
//         } }})

//         await Battle.destroy({ transaction : t, where : { owner : {
//           [Op.in] : emails
//         } }});

//         await Avatar.destroy({ transaction : t, where : { owner : {
//           [Op.in] : emails
//         } } });

//         await User.destroy({ transaction : t, where : { id : {
//           [Op.in] : userIds
//         } }});

//         res.formatter.ok("successfully deleted!");
//       }catch(error){
//         throw error;
//       }
//     });

//   }).catch((error) =>{
//     console.log('ERR', error);
//     res.formatter.serverError(error.toString());
//   });

// });

module.exports = router;
