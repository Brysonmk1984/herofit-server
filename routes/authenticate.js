const express = require('express');
const router = express.Router(); 
const User = require('../db').User;
const moment = require('moment');
var jwt = require('jsonwebtoken');
var jwkToPem = require('jwk-to-pem');
var jwkJson =  require('../jwk.json');
const { config } = require('../appConfig');

var key = jwkJson['keys'].find(key => {
 return key.kid;
})
var pem = jwkToPem(key);

// Handles both Register and login. 
router.post('/signup-or-signin', function(req, res, next){
  console.log('in SINGUPORSIGNIN');
  console.log('BODY - ', req.body);
  // res.status(500).json({
  //   message: `SERVER DOWN FOR MAINTENANCE`,
  // });
  jwt.verify(req.body.token, pem, { algorithms: ['RS256'] }, function(err, decoded) {
    if(err){
      res.status(401).json({
        message: `Token failed validation, see debug for error description`,
        debug : err
      });
      next();
    }else{  console.log('in SINGUPORSIGNIN 2');
      // TOKEN has Expired
      if (Date.now() >= decoded.exp * 1000) {
        res.status(401).json({
          message: `COGNITO TOKEN EXPIRED`,
          debug : `Token Expiration: ${moment.utc(decoded.exp)}, Evaluation Date: ${moment.utc(Date.now())}`
        });
        next();
      // AUDIENCE in token different from Client ID
      }else if(decoded.aud !== process.env.COGNITO_CLIENT_ID){
        res.status(401).json({
          message: `AUD / CLIENT ID MISMATCH`,
          debug : `AUD : ${decoded.aud}, CLIENT ID: ${process.env.COGNITO_CLIENT_ID}`
        });
      // TOKEN IS LEGIT
      }else{  console.log('TOKEN IS LEGIT');
        //console.log('DECODED', decoded);
        let username;
        // Must have unique username, low priority bug possible here.
        if(decoded['custom:first_name']){
          username = decoded['custom:first_name'];
          if(decoded['custom:last_name']){
            username += ` ${decoded['custom:last_name']}`;
          }
        }else{
          username = decoded['cognito:username'];
        }
        console.log('DEMAIL-', decoded.email);
        User.findOrCreate({
          where: {
            email: decoded.email
          },
          // set the default properties if it doesn't exist
          defaults: { 
            email: decoded.email,
            username : username,
            firstName : decoded['custom:first_name'] || null,
            lastName : decoded['custom:last_name'] || null,
            featurePreferenceSubmitted : true
          }
        }).then(function(result) {
          console.log('in THEN OF SUSI');
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
          next();
        }).catch((error)=>{
          console.log('in ERROR OF SUSI');
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
            next();
          }
        })
      }
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

module.exports = router;

