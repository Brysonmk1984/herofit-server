const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateJWT } = require('../jwtValidation');
const router = express.Router(); 
const { User } = require('../config/db');
const moment = require('moment');
const { config } = require('../appConfig');
const latestPatchDetails = require('../patchDetails/latest.json');
// mobile app only
const heroList = require('../heroList.json');

// Handles both Register and login. 
router.get('/signup-or-signin', authenticateJWT,  (req, res) => {
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    return res.formatter.badRequest(errors.array(), "Validation Error - for /signup-or-signin");
  }

  if(config.mode === 'maintenance'){
    return res.formatter.serviceUnavailable('Server is down for maintenance, please try again later...');
  }

    
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
  }).then((result) => {
    let response = {
      user : result[0].dataValues ? result[0].dataValues : result[0]
    }
    if(config.globalMessage && config.globalMessage.length){
      response.globalMessage = config.globalMessage;
    }
    return res.formatter.ok(response);
  }).catch((error)=>{
    // USERNAME IS THE SAME AS SOMEONE ELSES, NEED TO MODIFY IT AND TRY AGAIN
    if(error && error.original && error.original.code === '23505'){

      User.create({
          email: jwtUser.email,
          username : `${jwtUser['custom:first_name'] || 'New Hero'} ${jwtUser['custom:last_name'] || ''} - ${moment().format("MM DD, YYYY")}`,
          firstName : jwtUser['custom:first_name'] || null,
          lastName : jwtUser['custom:last_name'] || null
      })
      .then((result) =>{
        let response = { user : result.dataValues }
        if(config.globalMessage && config.globalMessage.length){
          response.globalMessage = config.globalMessage;
        }
        return res.formatter.ok(response);
      })
      .catch((error) =>{console.log('error', error);
        res.serverError(error.toString(), `Couldn't find or create user, second attempt in catch ${jwtUser.email}`);
      })
    }else{
      console.log(`Couldn't find or create user ${jwtUser.email}, DEBUG: ${error}`);
      res.serverError(error.toString(), `Couldn't find or create user ${jwtUser.email}`);
    }
  });
});

router.get('/strava-client-credentials', authenticateJWT, (req, res) =>{
  res.formatter.ok({
    clientId: process.env.STRAVA_CLIENT_ID,
    clientSecret: process.env.STRAVA_CLIENT_SECRET,
    redirectUri : process.env.NODE_ENV === 'production' ? process.env.STRAVA_REDIRECT_PROD : process.env.NODE_ENV === 'staging' ?  process.env.STRAVA_REDIRECT_STAGING : process.env.STRAVA_REDIRECT_DEV
  });
});

router.post('/strava-credentials', body('email').isEmail(), body('stravaAccessToken').isString(), body('stravaAccessTokenExpiration').isNumeric(), body('stravaRefreshToken').isString(), authenticateJWT, (req, res) =>{
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    return res.formatter.badRequest(errors.array(), "Validation Error - for /strava-credentials");
  }

  console.log('!!! headers sent to strava-credentials', req.headers, req.headers.authorization);
  const { email, stravaAccessToken, stravaAccessTokenExpiration, stravaRefreshToken } = req.body;
  User.findOne({ where: { email } })
  .then((user) =>{
    // Check if record exists in db
    if (user) {
      User.update(
        { stravaAccessToken, stravaAccessTokenExpiration, stravaRefreshToken },
        { where: { email },
        returning : true, plain : true })
      .then((data) => {
        res.formatter.ok({
          user : data[1]
        });
      })
      .catch((error)=>{
        console.log(`Couldn't update Strava tokens for user ${email}, DEBUG: ${error}`);
        res.serverError(error.toString(), `Couldn't update Strava tokens for user ${email}`);
      });
    } else {
      console.log('User not found!');
      const error = new Error('User not found!');
      res.formatter.serverError(error.toString());
    }
  }).catch((error)=>{
    console.log(`Couldn't find user ${email} to update their Strava, DEBUG: ${error}`);
    res.formatter.serverError(error.toString(), `Couldn't find user ${email}`);
  });
});

router.get('/fetch-latest-patch-details', authenticateJWT, (req, res) =>{
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    return res.formatter.badRequest(errors.array(), "Validation Error - for /fetch-latest-patch-details");
  }

  if(!latestPatchDetails){
    const error =  new Error("There was a server error, please try again later");
    res.formatter.serverError(error.toString(), "Can't find latest Patch Details");
  }
  res.formatter.ok(latestPatchDetails);
});

router.post('/update-seen-latest-patch', body('id').isNumeric(), authenticateJWT, (req, res) =>{
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    return res.formatter.badRequest(errors.array(), "Validation Error - for /update-seen-latest-patch");
  }
  
  const id = req.body.id;
  User.update(
    { seenLatestPatch : true },
    { where : { id }, returning : true },
  ).then((data) =>{
    res.formatter.ok({ data : "seen latest patch set to true" });
  }).catch((error) =>{
    console.log(`Couldn't update seenLatestPatch boolean for userID ${id}`);
    res.formatter.serverError(error.toString(), "Database or server code error for /update-seen-latest-patch");
  });
});

// Mobile app only
router.get('/hero-list', (req, res) =>{
  if(!heroList){
    const error = new Error("Couldn't retrieve hero list!")
    return res.formatter.serverError(error.toString());
  }
  const heroListForApp = heroList.map(heroData => {
    return { character : heroData.character, alias : heroData.alias, description : heroData.description, history : heroData.history,
      fire : heroData.elms.fire, earth : heroData.elms.earth, water  : heroData.elms.water, air : heroData.elms.air
    }
  })

  res.formatter.ok(heroListForApp);
});

module.exports = router;

