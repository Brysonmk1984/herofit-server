const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router(); 
const fs = require('fs');
const path = require("path");
const moment = require('moment');
const { shuffleArray, parseAvatarProperties, getRandomNumber } = require('../helperFunctions');
// MOCK DATA
const mockAvatarNames = require('../mockData/mockAvatarNames');
const mockActivities = require('../mockData/mockActivities');
// MODELS
const User = require('../db').User;
const UserActivity = require('../db').UserActivity;
const Avatar = require('../db').Avatar;


// Create fake account from passed COGNITO EMAIL and return to front end
router.post('/create-cognito-linked-account', function(req, res, next){

  if(req.body.email){

    let username;
    
    if(req.body.firstName || req.body.lastName ){
      username = `${req.body.firstName} ${req.body.lastName}`;
    }else{
      username = shuffleArray(mockAvatarNames)[0];
    }

    User.findOrCreate({
      where: {
        email: req.body.email
      },
      // set the default properties if it doesn't exist
      defaults: { 
        email: req.body.email,
        username : username,
        firstName : req.body.firstName || null,
        lastName : req.body.lastName || null,
        isFake : true
      }
    }).then(function(result) {
      const created = result[1];
      let user = result[0].dataValues;

      // New user, created a new db
      if (created) {
        res.status(200).json({
          message: `New user created -  ${user.username}`,
          user
        });
      // User already exists, return data from db
      }else{
        console.log('User already exists', user.createdAt);
        
        res.status(200).json({
          message: `User -   ${user.username}`,
          user
        });
      }
      next();
    }).catch((error)=>{
      // USERNAME IS THE SAME AS SOMEONE ELSES, NEED TO MODIFY IT AND TRY AGAIN
      if(error && error.original.code === '23505'){
        User.create({
            email: req.body.email,
            username : shuffleArray(mockAvatarNames)[0],
            firstName : req.body.firstName || null,
            lastName : req.body.lastName || null
        })
        .then((result) =>{

          // Need to remove mock username
          const namesMinusUsed = JSON.stringify(mockAvatarNames.filter((avName) => avName !== user.username));
          fs.writeFileSync(path.resolve(__dirname,'../mockData/mockAvatarNames.json'), namesMinusUsed);

          let user = result.dataValues;
            res.status(200).json({
              message: `You are logged in as ${user.username}`,
              user
            });
        })
        .catch((error) =>{console.log('error', error);
          res.status(400).json({
            message: `Couldn't find or create user, but second attempt in catch ${req.body.email}`,
            debug : error
          });
        })
      }else{
        console.log(`Couldn't find or create user ${req.body.email}, DEBUG: ${error}`);
        res.status(400).json({
          message: `Couldn't find or create user ${req.body.email}`,
          debug : error
        });
        next();
      }
    });
  }else{
    res.status(400).json({
      message: `No Passed email`
    });
  }
});

//  Returns the dummy list of fake activities
router.post('/get-fake-activities',  body('count').isNumeric(), (req,res) => {
  const count = req.body.count;
  const activities = shuffleArray(mockActivities).slice(0,count).map((act) =>{
    act.id = getRandomNumber(10);
    return act;
  });
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for get-fake-activities endpoint");
  }

  res.formatter.ok(activities);
});

// BROKEN - integer out of range - Inserts fake activities into account by email
router.post('/insert-mock-activities', body('count').isNumeric(), body('email').isEmail(), (req,res) =>{
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for insert-mock-activities");
  }
  const count = req.body.count;
  const activities = shuffleArray(mockActivities).slice(0,count).map((act) =>{
    act.id = getRandomNumber(10);
    return act;
  });
  console.log('INSERTING THIS MANY ACTS - ',activities.length, 'mock acts - ', mockActivities.length, 'couunt', count);
  const entries = activities.map((activity) =>{
    activity.start_date = moment.utc().format('YYYY-MM-DDTHH:mm:ss');
    activity.start_date_local = moment().format('YYYY-MM-DDTHH:mm:ssZ');
    console.log('ASD - ', activity.id);
    return { id: 8001, user : req.body.email,  activity, activityDate : activity.start_date };
  });
  console.log('ENTRIES - ', entries);
  // Add latestActivityUpdate to DB for user
  User.update(
    {latestActivityUpdate : moment.utc(entries[entries.length.start_date]).format('YYYY-MM-DD HH:mm:ss')},
    { where: { email: req.body.email } }
  ).then((result) => {
    console.log('INSERT USER ACTIVITIES',entries);
    // Front end is determining which activities are new, so everything passed here can be added to db.
    return UserActivity.bulkCreate(entries);
  }).then((result) =>{
    console.log('HERE!', result);
    return res.formatter.ok({ activities : req.body.activities });
  }).catch((error)=>{
    console.log('ERR', error);
    error = error.toString();
    res.formatter.badRequest(error, 'Database Update Error - Unable to bulk insert activities')
  });

});

// Verify the Admin Password is Correct in order to open the Admin panel
router.post('/check-admin-password', body('password').custom((password) =>{
  return password === process.env.ADMIN_PANEL_PASSWORD ? true : false; 
}), (req,res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Some meta data");
  }
  
  res.formatter.ok({isValid : true});
});

// Manually set Avatar's health and status
router.post('/set-avatar-health-and-status', 
  body('id').isNumeric(), 
  body('health').isNumeric(), 
  body('status').isIn(['Recovering', 'Rested', 'Knocked Out', 'New Recruit']),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.formatter.badRequest(errors.array(), "Validation Error - for set-avatar-health-and-status endpoint");
    }

    return Avatar.update(
      { health : req.body.health, status : req.body.status },
      { where: { id: req.body.id }, returning : true, raw : true }
    ).then((avatar) =>{
      // Shouldn't ever happen
      if(!avatar){
        throw new Error(`No Avatar to set health and status for Avatar ID: ${req.body.id}`);
      }else if(!avatar[1] || !avatar[1][0]){
        throw new Error('Error with Sequelize return formatting.');
      }

      res.formatter.ok({ avatar : parseAvatarProperties(avatar[1][0]) });
    }).catch((error) =>{
      error = error.toString();
      res.formatter.notFound(error.toString(), 'Retrieved Data Error for set-avatar-health-and-status endpoint');
    });
  }
);

module.exports = router;