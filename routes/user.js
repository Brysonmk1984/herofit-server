const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateJWT } = require('../jwtValidation');
const router = express.Router(); 
const User = require('../db').User;
const Avatar = require('../db').Avatar;
const AvatarItems = require('../db').AvatarItems;
const Battle = require('../db').Battle;
const UserActivity = require('../db').UserActivity;
const UserTotal = require('../db').UserTotal;
const moment = require('moment');
const utCalc = require('../game/upgrades/utCalc');
const xpCalc = require('../game/upgrades/xpCalc');
const { Op } = require('sequelize');

// Initialize the user_totals instance for a new user
router.post('/instantiate-user-totals', body('email').isEmail(), body('avatarId').isNumeric(), authenticateJWT, (req, res) => {
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    return res.formatter.badRequest(errors.array(), "Validation Error - for POST /instantiate-user-totals Endpoint");
  }
  const { email, avatarId } = req.body;

  UserTotal.findOrCreate({
    where: {
      user: email
    },
    // set the default properties
    defaults: { 
      user: email,
      avatarId
    },
    raw : true
  }).then((result) =>{console.log('INSTANTIATION RESULT - ', result);
    const created = result[1];
    const results = result[0].dataValues;

    console.log('RESS!!', created, results);

    // New user_total Created
    if(created){
      res.formatter.ok({ results });
    // Updated Existing Avatar
    }else if(!created){
      res.formatter.ok({ results });
    }else{
      throw new Error("Couldn't Instantiate user totals.");
    }

  }).catch((error) =>{
    console.log(`Error Instantiating user total for ${email}, DEBUG: ${error}`);
    res.formatter.serverError(error.toString(), `Error Instantiating user total for ${email} - POST /instantiate-user-totals Endpoint`);
  });
});

// Update existing user's totals, happends FIRST in upgrade sequence - UPDATE USER TOTALS, UPDATE ACTIVITIES, UPGRADE HERO
router.post('/update-user-totals', body('email').isEmail(), body('activities').isArray(), body('hasBeenUpgraded').isBoolean(), body('accountDate').isString(), authenticateJWT, (req, res) => {
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    return res.formatter.badRequest(errors.array(), "Validation Error - for POST /update-user-totals Endpoint");
  }
  const { email, activities, hasBeenUpgraded, accountDate } = req.body;


  // First, retrieve userTotals from DB
  UserTotal.findOne(
    { where: { user: email }, raw : true }
  ).then((utData) => {console.log('UTD',utData);
    if(!utData){
      throw new Error(`No User Totals for user ${email}`);
    }
    // Then Update userTotals
    const { update, initialUpdate } = utCalc(utData);
    // If user has already updated avatar, run update function, otherwise the initialUpdate which uses previous 10 activities.
    const updatedUT = hasBeenUpgraded ? update(activities) : initialUpdate(activities, accountDate);
    // Finally, save to DB
    return UserTotal.update(
      updatedUT,
      { where: { user: email } }
    );
  
  }).then((result) =>{
    res.formatter.ok({ totalsUpdated : true, result });
  }).catch((error) =>{
    console.log('Error - ', error);
    res.formatter.serverError(error.toString(), `Error updating user total for ${email} - POST /update-user-totals Endpoint`);
  });
});

// Insert user activities, happends SECOND in upgrade sequence - UPDATE USER TOTALS, UPDATE ACTIVITIES, UPGRADE HERO
router.post('/insert-user-activities', body('email').isEmail(), body('activities').isArray(), authenticateJWT, (req, res) => {
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    return res.formatter.badRequest(errors.array(), "Validation Error - for POST /insert-user-activities Endpoint");
  }
  const { email, activities } = req.body;
  console.log('ALL PASSED ACTS - ', activities);

  // In case the activities are invalid... this should eventually be moved to the validation middleware.
  if(!activities[0].id){
    return res.formatter.serverError(error.toString(), `Error updating latest activity to user table for user  ${email} - POST /insert-user-activities Endpoint, ACT 0 - ${activities[0]}`);
  }

  // Need latest Activity to be added to user's account
  let latestActivityUpdate = null;
  const entries = activities.map((activity) =>{
    activityId = activity.id;
    //console.log('ACT in question - ', activity, activityId);
    const activityDate = moment.utc(activity.start_date);
    // Check for latest activity (doesn't include DB activities)
    if(latestActivityUpdate === null){
      latestActivityUpdate = activity.start_date;
    }else if( activityDate.isAfter(moment.utc(latestActivityUpdate)) ){
      latestActivityUpdate = activity.start_date;
    }
    return { user : email,  activity, activityDate : activity.start_date, activityId };
  });

  // Add latestActivityUpdate to DB for user
  User.update(
    {latestActivityUpdate : moment.utc(latestActivityUpdate).format('YYYY-MM-DD HH:mm:ss')},
    { where: { email } }
  ).then(() => {
    const actIdMap = entries.map((entry) =>{
      //console.log(entry.activityId);
      return entry.activityId
    });
    console.log('ACT ID MAP-', actIdMap);
    // Front end is determining which activities are new, so everything passed here can be added to db.
    UserActivity.bulkCreate(entries, { ignoreDuplicates: true })
    //UserActivity.bulkCreate(entries)
    .then((result) =>{
      console.log('INSERTING USER ACTIVITIES, result - ', result);
      res.formatter.ok({ activities : activities });
    }).catch((error)=>{
      const actIdMap = entries.map((entry) =>{
        console.log(entry.activityId);
        return entry.activityId
      });
      console.log(`Error bulk inserting user activities for ${email} DEBUG: ACTID-${actIdMap.join()} ${error}`);
      res.formatter.serverError(error.toString(), `Error bulk inserting user activities for ${email} ACTIDs-${actIdMap.join()} - POST /insert-user-activitiesEndpoint`);
    });
  }).catch((error)=>{
    console.log(`Error updating latest activity to user table for user ${email} DEBUG: ${error}`);
    res.formatter.serverError(error.toString(), `Error updating latest activity to user table for user  ${email} - POST /insert-user-activities Endpoint`);
  });
});

// Get all user activities by email - used only for the logged in user
router.post('/get-user-activities', body('email').isEmail(), authenticateJWT, (req, res) => {
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    return res.formatter.badRequest(errors.array(), "Validation Error - for POST /get-user-activities Endpoint");
  }
  const { email } = req.body;

  UserActivity.findAll({ where: { user: email }, raw: true, limit : 250, order:[["activityDate", 'DESC']],
    attributes : ['id', 'activity', 'activityDate']
  }).then((results) =>{
    if(results.length){
      const datesArray = results.map((result, i) =>{
        return result.activityDate;
      });

      let moments = datesArray.map(d => moment(d, 'YYYY-MM-DD HH:mm:ss')),
      //maxDate = moment.utc(moment.max(moments)).format('YYYY-MM-DD HH:mm:ss');
      maxDate = moment.utc(moment.max(moments), 'YYYY-MM-DD HH:mm:ss');

      const activities = results.map((result, i) =>{
        return result.activity;
      });
      console.log('LATEST _SAVED - ',maxDate);
      res.formatter.ok({ activities, latestActivityDate : maxDate });
    }else{
      res.formatter.ok({ activities : null });
    }
  }).catch((error)=>{
    console.log(`Error getting saved user activities for ${email}, DEBUG : ${error}`);
    res.formatter.serverError(error.toString(), `Error getting saved user activities for ${email} - POST /get-user-activities Endpoint`);
  });
});

// PROFILE PAGE
// Initial page load of profile page, uses username as a parameter
router.post('/get-info-by-username', body('username').isString(), (req, res) => {
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    return res.formatter.badRequest(errors.array(), "Validation Error - for POST /get-info-by-username Endpoint");
  }
  const { username } = req.body;

  let userTotals, activities, avatar, battles;
  // First, exchange the username for the email
  User.findOne({ where: { username }, attributes : ['email'], raw : true })
  .then((data) =>{
    if(!data){
      return res.formatter.ok({ noUser : true });
    }
    const allPromises = [];

    allPromises.push(UserTotal.findOne({ where: { user: data.email }, attributes : ['run', 'hike', 'walk', 'ride', 'weightTraining', 'yoga', 'stairStepper', 'elliptical', 'swim', 'rowing', 'crossfit', 'standUpPaddling', 'workout', 'ski', 'snowboard', 'snowshoe', 'kayaking'], raw : true }));
    allPromises.push(UserActivity.findAll({ where: { user: data.email }, raw: true, attributes : ['id', 'activity', 'activityDate']}));
    allPromises.push(Avatar.findOne({ where: { owner: data.email }, raw : true }));
    allPromises.push(Battle.findAll({ where: { owner: data.email }, raw : true, order: [['createdAt', 'ASC']] }));
    
    return Promise.allSettled(allPromises);
  }).then(([ut, act, av, bat]) =>{
    userTotals = ut;
    activities = act;
    avatar = av;
    battles = bat;
    return AvatarItems.findAll({ where: { avatarID : avatar.value.id }, raw : true })
  }).then((itemInstances) =>{
    userTotals = userTotals.value;
    activities = activities.value.map((act) =>act.activity);
    battles = battles.value;
    const { currentLevelByInput } = xpCalc();
    avatar = avatar.value;
    avatar.level = currentLevelByInput(avatar.activityXP + avatar.battleXP);

    res.formatter.ok({userTotals, activities, avatar, battles, itemInstances });
  }).catch((error)=>{
    console.log('Error - ', error);
    res.formatter.serverError(error.toString(), `Error retrieving data for ${username} - POST /get-info-by-username Endpoint`);
  });

});

// User performs a search on the profile page, brings up all users and avatars by that name
router.post('/get-matching-users', body('searchInput').isString(), (req, res) => {
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    return res.formatter.badRequest(errors.array(), "Validation Error - for POST /get-matching-users Endpoint");
  }
  const { searchInput } = req.body;
  const allPromises = [];

  allPromises.push(Avatar.findAll({
    where: { name: { [Op.iLike]: `%${searchInput}%` } }
  }));

  allPromises.push(User.findAll({
    where: { username: { [Op.iLike]: `%${searchInput}%` } }
  }));

  Promise.allSettled(allPromises)
  .then((data) =>{console.log('DATA', data);
    const userList = [data[0].value, data[1].value];
    res.formatter.ok({ userList });
  }).catch((error) =>{
    console.log('Error - ', error);
    res.formatter.serverError(error.toString(), `Error retrieving list for query  ${searchInput} - POST /get-matching-users Endpoint`);
  });
});

// After a user searches for a user, they click an email from the list. Load selected user
router.post('/get-user-by-email', body('email').isEmail(), (req, res) => {
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    return res.formatter.badRequest(errors.array(), "Validation Error - for POST /get-user-by-email Endpoint");
  }
  const { email } = req.body;

  User.findOne({ where: { email }, attributes : ['username'], raw : true })
  .then((data) =>{
    res.formatter.ok({ username : data.username });
  }).catch((error) =>{
    console.log('Error - ', error);
    res.formatter.serverError(error.toString(), `Error retrieving username for  user ${email} - POST /get-user-by-email Endpoint`);
  });
});

// ONE TIME USE FIX
// Loop over all activities of a user and recalculate user totals.
// router.post('/recalculate-user-totals', body('email').isEmail(), (req, res) => {
//   const errors = validationResult(req);
//   if(!errors.isEmpty()){
//     return res.formatter.badRequest(errors.array(), "Validation Error - for POST /recalculate-user-totals Endpoint");
//   }
//   const { email } = req.body;

//   UserTotal.findOne(
//     { where: { user : email }, raw : true }
//   ).then((utData) => { console.log('UTD',utData);
//     if(!utData){
//       throw new Error(`No User Totals for user ${email}`);
//     }
//     // Then Update userTotals
//     const { update, initialUpdate, reset } = utCalc(utData);
//     const utAfterRest = reset();

//     console.log('UTAR', utAfterRest);
//     UserActivity.findAll({
//       where : { user : email }
//     }).then((activities) =>{
//       //console.log('THE RESULT - ', activities);
//       const actsWithoutExtraData = activities.map((a) =>{
//         return a.activity;
//       });
//       console.log(actsWithoutExtraData[0]);
//       const updatedUT = update(actsWithoutExtraData);

//       console.log('UDPATED - ', updatedUT);
//       // Finally, save to DB
//       return UserTotal.update(
//         updatedUT,
//         { where: { user: email }, returning : true }
//       );
//     }).then((data) =>{
//       console.log('THE END DATA - ', data);
//       res.formatter.ok('test');
//     }).catch((error) =>{
//       console.log('error - ', error);
//     });


//   });

// });

module.exports = router;