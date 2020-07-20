const express = require('express');
const router = express.Router(); 
const User = require('../db').User;
const passport = require('passport');
var jwt = require('jsonwebtoken');
var jwkToPem = require('jwk-to-pem');
var jwkJson =  require('../jwk.json');

var key = jwkJson['keys'].find(key => {
 return key.kid;
})
var pem = jwkToPem(key);

router.post('/logged-in', function(req, res, next){
  jwt.verify(req.body.token, pem, { algorithms: ['RS256'] }, function(err, decoded) {
    console.log('decoded token',decoded)

    res.status(200).send({
      success: true,
      message: `You are logged in as`,
      token: decoded
    });
    
  });
   
   
 
});

module.exports = router;