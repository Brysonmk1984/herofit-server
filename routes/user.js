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

  UserActivity.bulkCreate(entries).then((result) =>{
      console.log('INSERT USER ACTIVITIES',result.user_activities.dataValues);
      res.status(200).send({
        success: true,
        message: `Activities added for user ${req.body.email}`,
        activities : result.dataValues
      });
      next();
    }).catch((err)=>{
      console.log('ERROR', err);
      next();
    });
});

router.post('/get-user-activities', function(req, res, next){
  console.log('HETEETTERRE');
  UserActivity.findAll({ where: { user: req.body.email },
    attributes : ['id', 'activity', 'activityDate']
  })
  .then((results) =>{
    //console.log('GET USER ACTIVITIES RESULTS', results[0].user_activities);
  
    const datesArray = results.map((result, i) =>{
      return result.dataValues.activityDate;
    });

    let moments = datesArray.map(d => moment(d)),
    maxDate = moment.max(moments).format('YYYY-MM-DD HH:mm:ss');
    //console.log(maxDate);
    const activities = results.map((result, i) =>{
      return JSON.parse(result.dataValues.activity);
    });


    //console.log('ACT ARRAY', activities, latestActivityDate);
    res.status(200).send({
      success: true,
      message: `Activities for user ${req.body.email}`,
      activities : activities,
      latestActivityDate : maxDate
    });
    next();
    
  })
   .catch((err)=>{
    console.log('ERROR', err);
    next();
  });
});

// router.post('/insert-or-update-totals', function(req, res, next){
  
//   UserTotal.findOrCreate({
//     where: {
//       user: req.body.email
//     },
//     // set the default properties if it doesn't exist
//     defaults: { 
//       email: req.body.email,
//       run: JSON.stringify(req.body.run),
//       walk: JSON.stringify(req.body.walk),
//       hike: JSON.stringify(req.body.hike),
//       cycle: JSON.stringify(req.body.cycle),
//       yoga: JSON.stringify(req.body.yoga),
//       weightLifting: JSON.stringify(req.body.items),
//       stairStepper: JSON.stringify(req.body.weightLifting),
//       elliptical: JSON.stringify(req.body.elliptical),
//       swim: JSON.stringify(req.body.swim),
//     }
//   }).then((result) =>{
//     const created = result[1];
//     const results = result[0].dataValues;
//     let response = results;
    
//     // New Avatar Created
//     if(created){
//       response = {
//         success: true,
//         message: `New Avatar Saved belonging to owner ${avatar.owner}`,
//         results
//       };
//     // Updated Existing Avatar
//     }else{
//       response = {
//         success: true,
//         message: `Existing Avatar updated belonging to owner ${avatar.owner}`,
//         results
//       };
//     }
//     res.status(200).send(response);
//     next();
//   }).catch((err) =>{
//     console.log('ERRRRROR', err);
//     next();
//   });
// });


// router.post('/get-user-totals', function(req, res, next){
//   UserTotal.findOne({ where: { user: req.body.email } })
//   .then((result) =>{
//     console.log(result, result.dataValues);
//     res.status(200).send({
//       success: true,
//       message: `User Totals for user ${req.body.email}`,
//       totals : result.dataValues
//     });
//     next();
//   }).catch((err)=>{
//     console.log('ERROR', err);
//     next();
//   });
// });

module.exports = router;