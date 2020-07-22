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
          user
        });
      // User already exists, return data from db
      }else{
        console.log('User already exists');
        res.status(200).send({
          success: true,
          message: `You are logged in as ${user.username}`,
          preexisting : true,
          user
        });
      }
      next();
    }).catch((err)=>{
      console.log('ERRRRROR', err);
      next();
    });
  });
});

module.exports = router;