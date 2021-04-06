const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateJWT } = require('../jwtValidation');
const router = express.Router(); 
const User = require('../db').User;
const Avatar = require('../db').Avatar;
const AvatarEquip = require('../db').AvatarEquip;
const Battle = require('../db').Battle;
const UserActivity = require('../db').UserActivity;
const UserTotal = require('../db').UserTotal;
const db = require('../db').db;
const moment = require('moment');
const utCalc = require('../game/upgrades/utCalc');
const xpCalc = require('../game/upgrades/xpCalc');
const { Op } = require('sequelize');


router.post('/insert-user-activities', function(req, res, next){
  // Need latest Activity to be added to user's account
  let latestActivityUpdate = null;
  const entries = req.body.activities.map((activity) =>{
    activityId = activity.id;
    //console.log('ACT in question - ', activity, activityId);
    const activityDate = moment.utc(activity.start_date);
    // Check for latest activity (doesn't include DB activities)
    if(latestActivityUpdate === null){
      latestActivityUpdate = activity.start_date;
    }else if( activityDate.isAfter(moment.utc(latestActivityUpdate)) ){
      latestActivityUpdate = activity.start_date;
    }
    return { user : req.body.email,  activity, activityDate : activity.start_date, activityId };
  });

  // Add latestActivityUpdate to DB for user
  User.update(
    {latestActivityUpdate : moment.utc(latestActivityUpdate).format('YYYY-MM-DD HH:mm:ss')},
    { where: { email: req.body.email } }
  ).then(() => {

    // Front end is determining which activities are new, so everything passed here can be added to db.
    UserActivity.bulkCreate(entries)
    .then((result) =>{
      console.log('INSERTING USER ACTIVITIES');
      //console.log('INSERT USER ACTIVITIES',req.body.activities);
      res.status(200).json({
        message: `Activities added for user ${req.body.email}`,
        activities : req.body.activities
      });
      next();
    }).catch((err)=>{
      console.log(`Error bulk inserting user activities for ${req.body.email} DEBUG: ${err}`);
      res.status(400).json({
        message: `Error bulk inserting user activities for ${req.body.email}`,
        debug : err
      });
      next();
    });



  }).catch((err)=>{
    console.log(`Error updating latest activity to user table for user ${req.body.email} DEBUG: ${err}`);
    res.status(400).json({
      message: `Error updating latest activity to user table for user  ${req.body.email}`,
      debug : err
    });
    next();
  });




});

router.post('/get-user-activities', function(req, res, next){
  UserActivity.findAll({ where: { user: req.body.email }, raw: true,
    attributes : ['id', 'activity', 'activityDate']
  })
  .then((results) =>{
    if(results.length){
    
      const datesArray = results.map((result, i) =>{
        return result.activityDate;
      });

      let moments = datesArray.map(d => moment(d, 'YYYY-MM-DD HH:mm:ss')),
      maxDate = moment.utc(moment.max(moments)).format('YYYY-MM-DD HH:mm:ss');
      //console.log(maxDate);
      const activities = results.map((result, i) =>{
        return result.activity;
      });
      res.status(200).json({
        message: `Activities for user ${req.body.email}`,
        activities : activities,
        latestActivityDate : maxDate
      });
      next();
    }else{
      res.status(200).json({
        message: `No activities for user ${req.body.email}`
      });
      next()
    }
  })
   .catch((err)=>{
    console.log(`Error getting saved user activities for ${req.body.email}, DEBUG : ${err}`);
    res.status(400).json({
      message: `Error getting saved user activities for ${req.body.email}`,
      debug : err
    });
    next();
  });
});

router.post('/instantiate-user-totals', function(req, res, next){
  
  UserTotal.findOrCreate({
    where: {
      user: req.body.email
    },
    // set the default properties
    defaults: { 
      user: req.body.email,
      avatarId: req.body.avatarId
    },
    raw : true
  }).then((result) =>{console.log('INSTANTIATION RESULT - ', result);
    const created = result[1];
    const results = result[0].dataValues;

    console.log('RESS!!', created, results);

    // New user_total Created
    if(created){
      res.status(200).json({
        message: `New user total Saved belonging to owner ${req.body.email}`,
        results
      });
      next();
    // Updated Existing Avatar
    }else if(!created){
      res.status(200).json({
        message: `Existing User Totals belonging to owner ${req.body.email}`,
        results
      });
      next();
    }else{
      throw new Error("Couldn't Instantiate user totals.");
    }

  }).catch((err) =>{
    console.log(`Error Instantiating user total for ${req.body.email}, DEBUG: ${err}`);
    res.status(400).json({
      message: `Error Instantiating user total for ${req.body.email}`,
      debug : err
    });
    next();
  });
});

router.post('/update-user-totals', function(req, res, next){
  // First, retrieve userTotals from DB
  UserTotal.findOne(
    { where: { user: req.body.email }, raw : true }
  ).then(function(utData){
    if(!utData){
      throw new Error(`No User Totals for user ${req.body.email}`);
    }
    // Then Update userTotals
    const { update, initialUpdate } = utCalc(utData);
    const activities = req.body.activities;
    // If user has already updated avatar, run update function, otherwise the initialUpdate which uses previous 10 activities.
    const updatedUT = req.body.hasBeenUpgraded ? update(activities) : initialUpdate(activities, req.body.accountDate);
    // Finally, save to DB
    return UserTotal.update(
      updatedUT,
      { where: { user: req.body.email } }
    );
  
  }).then((result) =>{
    console.log('Update result - ', result);
    res.status(200).json({
      totalsUpdated : true,
      result
    });
  }).catch((error) =>{
    console.log('Error - ', error);
    res.status(400).json({
      debug : `Error updating user total for ${req.body.email}`,
      error
    });
  });
});


router.post('/get-user-totals', function(req, res, next){
  UserTotal.findOne({ where: { user: req.body.email }, attributes : ['run', 'hike', 'walk', 'ride', 'weightTraining', 'yoga', 'stairStepper', 'elliptical', 'swim', 'rowing', 'crossfit', 'standUpPaddling', 'workout', 'ski', 'snowboard', 'snowshoe'], raw : true })
  .then((userTotals) =>{
    if(userTotals){
      res.status(200).json({
        message: `User Totals for user ${req.body.email}`,
        userTotals
      });
    }else{
      res.status(200).json({
        message: `No saved Cumulative Data for ${req.body.email}`,
      });
    }
    next();
  }).catch((err)=>{
    console.log(`No saved Cumulative Data for ${req.body.email}, DEBUG: ${err}`);
    res.status(400).json({
      message: `No saved Cumulative Data for ${req.body.email}`,
      debug : err
    });
    next();
  });
});

router.post('/get-info-by-username', function(req, res, next){
  const username = req.body.username;
  let userTotals, activities, avatar, battles;
  // First, exchange the username for the email
  User.findOne({ where: { username }, attributes : ['email'], raw : true })
  .then((data) =>{
    
    const allPromises = [];

    allPromises.push(UserTotal.findOne({ where: { user: data.email }, attributes : ['run', 'hike', 'walk', 'ride', 'weightTraining', 'yoga', 'stairStepper', 'elliptical', 'swim', 'rowing', 'crossfit', 'standUpPaddling', 'workout', 'ski', 'snowboard', 'snowshoe'], raw : true }));
    allPromises.push(UserActivity.findAll({ where: { user: data.email }, raw: true, attributes : ['id', 'activity', 'activityDate']}));
    allPromises.push(Avatar.findOne({ where: { owner: data.email }, raw : true }));
    allPromises.push(Battle.findAll({ where: { owner: data.email }, raw : true }));
    
    return Promise.allSettled(allPromises);
  }).then(([ut, act, av, bat]) =>{
    userTotals = ut;
    activities = act;
    avatar = av;
    battles = bat;
    //console.log('AVID - ', avatar);
    return AvatarEquip.findAll({ where: { avatarID : avatar.value.id }, raw : true })
  }).then((equipment) =>{
    userTotals = userTotals.value;
    activities = activities.value.map((act) =>act.activity);
    battles = battles.value;
    const { currentLevelByInput } = xpCalc();
    avatar = avatar.value;
    avatar.level = currentLevelByInput(avatar.activityXP + avatar.battleXP);
    res.status(200).json({
      userTotals,
      activities,
      avatar,
      battles,
      equipment
    });
    next();
  }).catch((err)=>{
    console.log(`Error retrieving data for ${req.body.username}, DEBUG: ${err}`);
    res.status(400).json({
      message: `Error retrieving data for ${req.body.username}`,
      debug : err
    });
    next();
  });


});

router.post('/get-matching-users', function(req, res, next){
  const searchInput = req.body.searchInput;
  console.log('SI - ', searchInput);
  const allPromises = [];

  allPromises.push(Avatar.findAll({
    where: {
      name: {
        [Op.iLike]: `%${searchInput}%`
      }
    }
  }));

  allPromises.push(User.findAll({
    where: {
      username: {
        [Op.iLike]: `%${searchInput}%`
      }
    }
  }));

  Promise.allSettled(allPromises)
  .then((data) =>{
    const userList = [data[0].value, data[1].value];
    console.log('data - ', userList);
    res.status(200).json({
      message: `List for search query ${searchInput}`,
      userList 
    });
    next();
  }).catch((err) =>{
    console.log('err - ', err);
    res.status(400).json({
      message: `Error retrieving list for query  ${searchInput}`,
      debug : err
    });
    next();
  });

});

router.post('/get-user-by-email', function(req, res, next){
  User.findOne({ where: { email: req.body.email }, attributes : ['username'], raw : true })
  .then((data) =>{
    res.status(200).json({
      username : data.username
    });
  }).catch((err) =>{
    res.status(400).json({
      message: `Error retrieving username for  user ${req.body.email}`,
      debug : err
    });
    next();
  });
});




module.exports = router;