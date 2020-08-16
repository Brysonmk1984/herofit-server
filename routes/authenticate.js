const express = require('express');
const router = express.Router(); 
const User = require('../db').User;

var jwt = require('jsonwebtoken');
var jwkToPem = require('jwk-to-pem');
var jwkJson =  require('../jwk.json');

var key = jwkJson['keys'].find(key => {
 return key.kid;
})
var pem = jwkToPem(key);

// Handles both Register and login. 
router.post('/signup-or-signin', function(req, res, next){
  jwt.verify(req.body.token, pem, { algorithms: ['RS256'] }, function(err, decoded) {
    //console.log('decoded token',decoded)

    User.findOrCreate({
      where: {
        email: decoded.email
      },
      // set the default properties if it doesn't exist
      defaults: { 
        email: decoded.email,
        username : decoded['cognito:username'],
      }
    }).then(function(result) {
      const created = result[1];
      let user = result[0].dataValues;
      //console.log('RES', user);

      // New user, created a new db
      if (created) {
        user.preexisting = false;
        user = Object.assign({}, user, {
          preexisting : false,
          clientId : process.env.STRAVA_CLIENT_ID, 
          redirectUri : process.env.NODE_ENV === 'production' ? process.env.STRAVA_REDIRECT_PROD : process.env.STRAVA_REDIRECT_DEV, 
          clientSecret : process.env.STRAVA_CLIENT_SECRET
        });
        res.status(200).json({
          message: `You are logged in as ${user.username}`,
          user
        });
      // User already exists, return data from db
      }else{
        console.log('User already exists');
        
        user = Object.assign({}, user, {
          // !!!temp settings
          preexisting : true,
          // !!!dont need these
          clientId : process.env.STRAVA_CLIENT_ID, 
          redirectUri : process.env.NODE_ENV === 'production' ? process.env.STRAVA_REDIRECT_PROD : process.env.STRAVA_REDIRECT_DEV, 
          clientSecret : process.env.STRAVA_CLIENT_SECRET
        });
        res.status(200).json({
          message: `You are logged in as ${user.username}`,
          user
        });
      }
      next();
    }).catch((err)=>{
      console.log(`Couldn't find or create user ${decoded['cognito:username']}, DEBUG: ${err}`);
      res.status(400).json({
        message: `Couldn't find or create user ${decoded['cognito:username']}`,
        debug : err
      });
      next();
    });
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
        {where: {
          email: req.body.email
        }})
      .then(function (data) {
        res.status(200).json({
          message: `User updated with strava Credentials`,
          user : data.dataValues
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

module.exports = router;

