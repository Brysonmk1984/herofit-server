const express = require('express');
const router = express.Router(); 
const UserActivity = require('../db').UserActivity;
const UserTotal = require('../db').UserTotal;
const moment = require('moment');
let m = moment();

router.post('/insert-user-activities', function(req, res, next){
  // Front end is determining which activities are new, so everything passed here can be added to db.
  const entries = req.body.activities.map((activity) =>{
    return { user : req.body.email,  activity : JSON.stringify(activity), activityDate : activity.start_date };
  });

  UserActivity.bulkCreate(entries)
    .then((result) =>{
      console.log('INSERT USER ACTIVITIES',result);
      res.status(200).send({
        success: true,
        message: `Activities added for user ${req.body.email}`,
        activities : req.body.activities
      });
      next();
    }).catch((err)=>{
      console.log(`Error bulk inserting user activities for ${req.body.email}`);
      res.status(400).send({
        success: false,
        message: `Error bulk inserting user activities for ${req.body.email}`,
      });
      next();
    });
});

router.post('/get-user-activities', function(req, res, next){
  UserActivity.findAll({ where: { user: req.body.email },
    attributes : ['id', 'activity', 'activityDate']
  })
  .then((results) =>{
    if(results.length){
      //console.log('GET USER ACTIVITIES RESULTS', results, results[0].user_activities);
    
      const datesArray = results.map((result, i) =>{
        return result.dataValues.activityDate;
      });

      let moments = datesArray.map(d => moment(d)),
      maxDate = moment.max(moments).format('YYYY-MM-DD HH:mm:ss');
      //console.log(maxDate);
      const activities = results.map((result, i) =>{
        return JSON.parse(result.dataValues.activity);
      });

      res.status(200).send({
        success: true,
        message: `Activities for user ${req.body.email}`,
        activities : activities,
        latestActivityDate : maxDate
      });
      next();
    }else{
      console.log('DIDNT MAKE IT');
      res.status(200).send({
        success: true,
        message: `No activities for user ${req.body.email}`
      });
      next()
    }
  })
   .catch((err)=>{
    console.log(`Error getting saved user activities for ${req.body.email}, ERROR MESSAGE: ${err}`);
    res.status(400).send({
      success: false,
      message: `Error getting saved user activities for ${req.body.email}, ERROR MESSAGE: ${err}`
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
        success: true,
        message: `New user total Saved belonging to owner ${req.body.email}`,
        results
      };
    // Updated Existing Avatar
    }else{
      response = {
        success: true,
        message: `Existing Avatar updated belonging to owner ${req.body.email}`,
        results
      };
    }
    res.status(200).send(response);
    next();
  }).catch((err) =>{
    console.log(`Error Instantiating user total for ${req.body.email}, ERROR MESSAGE: ${err}`);
    res.status(400).send({
      success: false,
      message: `Error Instantiating user total for ${req.body.email}, ERROR MESSAGE: ${err}`
    });
    next();
  });
});

router.post('/update-user-totals', function(req, res, next){
  //console.log('UPDATE USER TOTALS' ,req.body.userTotals);
  let strTotals = {};
  for (const activity in req.body.userTotals) {
    //console.log(`${activity}: ${req.body.userTotals[activity]}`);
    if(req.body.userTotals[activity] !== null){
      //console.log({ [activity] : JSON.stringify(req.body.userTotals[activity]) });
      strTotals = Object.assign({}, strTotals, { [activity] : JSON.stringify(req.body.userTotals[activity]) })

    }
    
  }
  console.log('stringified totals',strTotals);
  UserTotal.update(
    strTotals,
    { where: { user: req.body.email } }
  )
  .then(function(result) {
    res.status(200).send({
      success: true,
      message: `${result[0]} record updated --- user ${req.body.email}`,
    });
  })
  .catch((err) =>{
    console.log(`Error updating user total for ${req.body.email}, ERROR MESSAGE: ${err}`);
    res.status(400).send({
      success: false,
      message: `Error updating user total for ${req.body.email}, ERROR MESSAGE: ${err}`
    });
    next();
  });
});


router.post('/get-user-totals', function(req, res, next){
  UserTotal.findOne({ where: { user: req.body.email }, attributes : ['run', 'hike', 'walk', 'ride', 'weightTraining', 'yoga', 'stairStepper', 'elliptical', 'swim'] })
  .then((result) =>{
    if(result){

      // Parse all stringified totals before sending it back to the client
      let parsedTotals = {}
      for(let total in result.dataValues){
        parsedTotals[total] =  JSON.parse(result.dataValues[total]);
      }

      res.status(200).send({
        success: true,
        message: `User Totals for user ${req.body.email}`,
        userTotals : parsedTotals
      });
    }else{
      res.status(200).send({
        success: false,
        message: `No saved Cumulative Data for ${req.body.email}`,
      });
    }
    next();
  }).catch((err)=>{
    console.log(`No saved Cumulative Data for ${req.body.email}, ERROR MESSAGE: ${err}`);
    res.status(400).send({
      success: false,
      message: `No saved Cumulative Data for ${req.body.email}, ERROR MESSAGE: ${err}`,
    });
    next();
  });
});

module.exports = router;