const express = require('express');
const router = express.Router(); 
const User = require('../db').User;
const UserActivity = require('../db').UserActivity;
const UserTotal = require('../db').UserTotal;
const moment = require('moment');

router.post('/insert-user-activities', function(req, res, next){
  // Need latest Activity to be added to user's account
  let latestActivityUpdate = null;
  const entries = req.body.activities.map((activity) =>{
    const activityDate = moment.utc(activity.start_date);
    // Check for latest activity (doesn't include DB activities)
    if(latestActivityUpdate === null){
      latestActivityUpdate = activity.start_date;
    }else if( activityDate.isAfter(moment.utc(latestActivityUpdate)) ){
      latestActivityUpdate = activity.start_date;

    }
    return { user : req.body.email,  activity, activityDate : activity.start_date };
  });

  // Add latestActivityUpdate to DB for user
  User.update(
    {latestActivityUpdate : moment.utc(latestActivityUpdate).format('YYYY-MM-DD HH:mm:ss')},
    { where: { email: req.body.email } }
  ).then(() => {

    // Front end is determining which activities are new, so everything passed here can be added to db.
    UserActivity.bulkCreate(entries)
    .then((result) =>{
      console.log('INSERT USER ACTIVITIES',result);
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

      let moments = datesArray.map(d => moment(d)),
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
    }
  }).then((result) =>{
    const created = result[1];
    const results = result[0].dataValues;
    let response = results;
    console.log('LOOOOK HERE', result);
    // New user_total Created
    if(created){
      response = {
        message: `New user total Saved belonging to owner ${req.body.email}`,
        results
      };
    // Updated Existing Avatar
    }else{
      response = {
        message: `Existing Avatar updated belonging to owner ${req.body.email}`,
        results
      };
    }
    res.status(200).json(response);
    next();
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

  // Then Update userTotals

  // Finally, save to DB
  UserTotal.update(
    req.body.userTotals,
    { where: { user: req.body.email } }
  )
  .then(function(result) {
    res.status(200).json({
      message: `${result[0]} record updated --- user ${req.body.email}`,
    });
  })
  .catch((err) =>{
    console.log(`Error updating user total for ${req.body.email}, DEBUG: ${err}`);
    res.status(400).json({
      message: `Error updating user total for ${req.body.email}`,
      debug : err
    });
    next();
  });
});


router.post('/get-user-totals', function(req, res, next){
  UserTotal.findOne({ where: { user: req.body.email }, attributes : ['run', 'hike', 'walk', 'ride', 'weightTraining', 'yoga', 'stairStepper', 'elliptical', 'swim', 'rowing', 'crossfit', 'standUpPaddling', 'workout'], raw : true })
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

module.exports = router;