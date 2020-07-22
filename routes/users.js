const express = require('express');
const router = express.Router(); 
const db = require('../db');
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
      const user = result[0].dataValues;
      console.log('RES', user);

      // New user, created a new db
      if (created) {
        res.status(200).send({
          success: true,
          message: `You are logged in as ${user.username}`,
          preexisting : false,
          strava : { clientId : process.env.STRAVA_CLIENT_ID, redirectUri : process.env.NODE_ENV === 'production' ? process.env.STRAVA_REDIRECT_PROD : process.env.STRAVA_REDIRECT_DEV, clientSecret : process.env.STRAVA_CLIENT_SECRET  },
          user
        });
      // User already exists, return data from db
      }else{
        console.log('User already exists');
        res.status(200).send({
          success: true,
          message: `You are logged in as ${user.username}`,
          user,
          // !!!these two are temp settings
          preexisting : true,
          //strava : { clientId : process.env.STRAVA_CLIENT_ID, redirectUri : process.env.NODE_ENV === 'production' ? process.env.STRAVA_REDIRECT_PROD : process.env.STRAVA_REDIRECT_DEV, clientSecret : process.env.STRAVA_CLIENT_SECRET },
        });
      }
      next();
    }).catch((err)=>{
      console.log('ERRRRROR', err);
      next();
    });
  });
});

router.get('/strava-client-credentials', function(req, res, next){
  console.log('HEREsss');
  res.status(200).send({
    success: true,
    message: `Here are the Strava Client Credentials.`,
    clientId: process.env.STRAVA_CLIENT_ID,
    clientSecret: process.env.STRAVA_CLIENT_SECRET,
    redirectUri : process.env.NODE_ENV === 'production' ? process.env.STRAVA_REDIRECT_PROD : process.env.STRAVA_REDIRECT_DEV
  })
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
      .then(function () {
        res.status(200).send({
          success: true,
          message: `User updated with strava Credentials`,
          user : user.dataValues
        });
        next();
      })
      .catch((err)=>{
        console.log('ERRRRROR', err);
        next();
      });
    }
  }).catch((err)=>{
    console.log('ERRRRROR', err);
    next();
  });
});

module.exports = router;