const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateJWT } = require('../jwt/validateJWT');
const router = express.Router(); 
const { User, Avatar, AvatarItems, Battle, UserActivity, UserTotal } = require('../config/db');
const moment = require('moment');
const xpCalc = require('../game/upgrades/xpCalc');
const { Op } = require('sequelize');
const { config } = require('../appConfig');

// If an email is passed, get that user, otherwise get user based on JWT
router.post('/user-details', body('email').isEmail().optional({ nullable: true, checkFalsy: true }), body('initMessage').isBoolean().optional({ nullable: true, checkFalsy: true }), authenticateJWT, (req, res) => {
  if(config.mode === 'maintenance'){
    return res.formatter.serviceUnavailable('Server is down for maintenance, please try again later...');
  }
  
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    console.log(errors);
    return res.formatter.badRequest(errors.array(), "Validation Error - for GET /user");
  }
  const { email, initMessage } = req.body;
  const user = req.user;

  User.findOne({ where : email ? { email } : { id : user.id }, raw : true })
  .then((user) =>{
    if(!user){
      res.formatter.unauthorized(`Couldn't find a user with that email.`);
    }

    const response = { user };
    // For initial load, also return any global message
    if(config.globalMessage && config.globalMessage.length){
      response.globalMessage = config.globalMessage;
    }

    return res.formatter.ok(response);
  }).catch((error) =>{
    console.log('Passport Auth error - ', error);
    res.formatter.serverError(error.toString(), `Error Logging in User - for GET /user`);
  })

});

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
router.post('/get-profile-info-by-email', body('heroName').isString(), (req, res) => {
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    return res.formatter.badRequest(errors.array(), "Validation Error - for POST /get-info-by-username Endpoint");
  }
  const { heroName } = req.body;

  let email, userTotals, activities, avatar, battles;
  // First, exchange the username for the email

  const allPromises = [];
  Avatar.findOne({ where: { name: heroName }, raw : true }).then((av) =>{
    if(!av){
      return res.formatter.ok({ noUser : true });
    }

    email = av.owner;
    avatar = av;
    allPromises.push(UserTotal.findOne({ where: { user: email }, attributes : ['run', 'hike', 'walk', 'ride', 'weightTraining', 'yoga', 'stairStepper', 'elliptical', 'swim', 'rowing', 'crossfit', 'standUpPaddling', 'workout', 'ski', 'snowboard', 'snowshoe', 'kayaking'], raw : true }));
    allPromises.push(UserActivity.findAll({ where: { user: email }, raw: true,  limit : 10, order: [['activityDate', 'DESC']], attributes : ['id', 'activity', 'activityDate']}));
    allPromises.push(Battle.findAll({ where: { owner: email }, raw : true,  limit : 50, order: [['createdAt', 'DESC']] }));
    allPromises.push(User.findOne({ where: { email }, attributes : ['username'], raw : true }));  
    return Promise.allSettled(allPromises)
  }).then(([ut, act, bat, user]) =>{
    userTotals = ut;
    activities = act;
    battles = bat;
    avatar.ownerUserName = user.value.username;
    return AvatarItems.findAll({ where: { avatarID : avatar.id }, raw : true })
  }).then((itemInstances) =>{
    userTotals = userTotals.value;
    activities = activities.value.map((act) =>act.activity);
    battles = battles.value;
    const { currentLevelByInput } = xpCalc();
    const { level, albedo } = currentLevelByInput(avatar.activityXP + avatar.battleXP);
    avatar.level = level;
    avatar.albedo = albedo;

    res.formatter.ok({userTotals, activities, avatar, battles, itemInstances });
  }).catch((error)=>{
    console.log('Error - ', error);
    res.formatter.serverError(error.toString(), `Error retrieving data for ${email} - POST /get-profile-info-by-email Endpoint`);
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
  .then((data) =>{
    const userList = [data[0].value, data[1].value];
    res.formatter.ok({ userList });
  }).catch((error) =>{
    console.log('Error - ', error);
    res.formatter.serverError(error.toString(), `Error retrieving list for query  ${searchInput} - POST /get-matching-users Endpoint`);
  });
});

// After a user searches for a user, they click an email from the list. Load selected user
router.post('/get-hero-name-by-username', body('username').isString(), (req, res) => {
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    return res.formatter.badRequest(errors.array(), "Validation Error - for POST /get-hero-name-by-username Endpoint");
  }
  const { username } = req.body;
  User.findOne({ where: { username }, attributes : ['email'], raw : true })
  .then((user) =>{
    return Avatar.findOne({ where: { owner : user.email }, attributes : ['name'], raw : true })
  }).then((data) =>{
    res.formatter.ok({ name : data.name });
  }).catch((error) =>{
    console.log('Error - ', error);
    res.formatter.serverError(error.toString(), `Error retrieving username for  user ${email} - POST /get-hero-name-by-username Endpoint`);
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