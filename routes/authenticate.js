const express = require('express');
const { body, header, validationResult } = require('express-validator');
const { authenticateJWT } = require('../jwtValidation');
const router = express.Router(); 
const User = require('../db').User;
const moment = require('moment');
const { config } = require('../appConfig');
const latestPatchDetails = require('../patchDetails/latest.json');

// Handles both Register and login. 
router.post('/signup-or-signin', authenticateJWT,  (req, res) => {
  // res.status(500).json({
  //   message: `SERVER DOWN FOR MAINTENANCE`,
  // });
    
  // TOKEN IS LEGIT
  const jwtUser = req.user;
  console.log('DECODED', jwtUser);
  let username;
  // Must have unique username, low priority bug possible here.
  if(jwtUser['custom:first_name']){
    username = jwtUser['custom:first_name'];
    if(jwtUser['custom:last_name']){
      username += ` ${jwtUser['custom:last_name']}`;
    }
  }else{
    username = jwtUser['cognito:username'];
  }
  //console.log('USER MODEL', User);
  User.findOrCreate({
    where: {
      email: jwtUser.email
    },
    // set the default properties if it doesn't exist
    defaults: { 
      email: jwtUser.email,
      username : username,
      firstName : jwtUser['custom:first_name'] || null,
      lastName : jwtUser['custom:last_name'] || null
    }
  }).then(function(result) {
    const created = result[1];
    let user = result[0].dataValues ? result[0].dataValues : result[0];

    // New user, created a new db
    if (created) {
      res.status(200).json({
        message: `New user created, logged in as ${user.username}`,
        user
      });
    // User already exists, return data from db
    }else{
      const response = {
        message: `You are logged in as ${user.username}`,
        user
      };
      if(config.globalMessage && config.globalMessage.length){
        response.globalMessage = config.globalMessage;
      }
      res.status(200).json(response);
    }

  }).catch((error)=>{
    // USERNAME IS THE SAME AS SOMEONE ELSES, NEED TO MODIFY IT AND TRY AGAIN
    if(error && error.original && error.original.code === '23505'){
      User.create({
          email: decoded.email,
          username : `${decoded['custom:first_name']} ${decoded['custom:last_name']} - ${moment().format("MM DD, YYYY")}`,
          firstName : decoded['custom:first_name'] || null,
          lastName : decoded['custom:last_name'] || null
      })
      .then((result) =>{
        let user = result.dataValues;
          // user = Object.assign({}, user, {
          //   clientId : process.env.STRAVA_CLIENT_ID, 
          //   redirectUri : process.env.NODE_ENV === 'production' ? process.env.STRAVA_REDIRECT_PROD : process.env.STRAVA_REDIRECT_DEV, 
          //   clientSecret : process.env.STRAVA_CLIENT_SECRET,
          // });

          res.status(200).json({
            message: `You are logged in as ${user.username}`,
            user
          });
      })
      .catch((error) =>{console.log('error', error);
        res.status(400).json({
          message: `Couldn't find or create user, but second attempt in catch ${decoded.email}`,
          debug : error
        });
      })
    }else{
      console.log(`Couldn't find or create user ${decoded.email}, DEBUG: ${error}`);
      res.status(400).json({
        message: `Couldn't find or create user ${decoded.email}`,
        debug : error
      });

    }
  });
  
    
 
});

router.get('/strava-client-credentials', function(req, res, next){

  res.status(200).json({
    message: `Here are the Strava Client Credentials.`,
    clientId: process.env.STRAVA_CLIENT_ID,
    clientSecret: process.env.STRAVA_CLIENT_SECRET,
    redirectUri : process.env.NODE_ENV === 'production' ? process.env.STRAVA_REDIRECT_PROD : process.env.STRAVA_REDIRECT_DEV
  });
  next();
});

router.post('/strava-credentials', function(req, res, next){
  User.findOne({ where: { email: req.body.email } })
  .then((user) =>{
    // Check if record exists in db
    if (user) {
      User.update(
        {
          stravaAccessToken: req.body.stravaAccessToken,
          stravaAccessTokenExpiration: req.body.stravaAccessTokenExpiration,
          stravaRefreshToken: req.body.stravaRefreshToken,
        },
        {where: {email: req.body.email},
        returning : true, plain : true })
      .then(function (data) {
        res.status(200).json({
          user : data[1]
        });
        next();
      })
      .catch((err)=>{
        console.log(`Couldn't update Strava tokens for user ${req.body.email}, DEBUG: ${err}`);
        res.status(400).json({
          message: `Couldn't update Strava tokens for user ${req.body.email}`,
          debug : err
        });
        next();
      });
    } else {
      console.log('User not found!');
      res.status(401).json({
        message: `User not found!`,
      });
    }
  }).catch((err)=>{
    console.log(`Couldn't find user ${req.body.email} to update their Strava, DEBUG: ${err}`);
    res.status(400).json({
      message: `Couldn't find user ${req.body.email}`,
      debug : err
    });
    next();
  });
});

router.post('/check-strava-refresh-token', function(req, res, next){
  User.findOne({ where: { email: req.body.email },
    attributes : ['stravaRefreshToken']
  }).then((results) =>{
    if(results.dataValues && results.dataValues.stravaRefreshToken){
      res.status(200).json({
        message: `Refresh Token Exists for ${req.body.email}`,
        stravaRefreshToken : results.dataValues.stravaRefreshToken,
      });
      next();
    }else{
      res.status(400).json({
        message: `No Strava refresh token in account ${req.body.email}`
      });
      next()
    }
  });
});

router.get('/fetch-latest-patch-details', authenticateJWT,  (req, res) =>{
  if(!latestPatchDetails){
    const error =  new Error("There was a server error, please try again later");
    res.formatter.serverError(error.toString(), "Can't find latest Patch Details");
  }
  res.formatter.ok(latestPatchDetails);

});

router.post('/update-seen-latest-patch', function(req, res, next){
  const id = req.body.id;
  User.update(
    { seenLatestPatch : true },
    { where : { id }, returning : true },
  ).then((data) =>{
    res.status(200).json({ data : "seen latest patch set to true" });
  }).catch((error) =>{
    console.log(`Couldnt update seenLatestPatch boolean for userID ${id}`);
    res.status(400).json({
      message: `Couldnt update seenLatestPatch boolean for userID ${id}`,
      debug : error
    });
    next();
  });
});


module.exports = router;

