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

router.post('/decode-hash', function(req, res, next){
  console.log('BODY TOKEN', req.body);
  jwt.verify(req.body.token, pem, { algorithms: ['RS256'] }, function(err, decoded) {
    console.log('decoded token',decoded)


    //async.eachSeries(users, function(item, callback) {
      //User.sync().then(function() {
        console.log('HERE');
        User.findOrCreate({
          where: {
            email: decoded.email
          },
          defaults: { // set the default properties if it doesn't exist
            email: decoded.email,
            username : decoded['cognito:username'],
          }
        }).then(function(result) {
          var email = result[0], // the instance of the author
            created = result[1]; // boolean stating if it was created or not
    
          if (!created) { // false if author already exists and was not created.
            console.log('Email already exists');
          }
    
          next();
        }).catch((err)=>{
          console.log('ERRRRROR', err);
          next();
        });
      //})
    //})



    // function isEmailUnique (email) {
    //   return db.Profile.count({ where: { email } })
    //     .then(count => {
    //       if (count != 0) {
    //         return false;
    //       }
    //       return true;
    //   });
    // }
      
    // isEmailUnique(decoded.email).then(isUnique => {
    //   // If NEW email, add it to PG database  
    //   if (isUnique) {
    //     const userObj = {
    //       email : decoded.email,
    //       username : decoded.username,
    //     };
        
    //     User.create(userObj)
    //     .then((user)=>{
    //       //const token = jwt.sign({ email : user.email }, process.env.JWTSECRET);
    //       res.json({
    //         email : user.email,
    //         username : user.dataValues.username,
    //         isAuthenticated : true,
    //         requestType : 'POST',
    //         success : true,
    //         cognitoToken : decoded
    //       });
    //       next();
    //     })
    //     .catch((err) =>{
    //       const errors = err.errors.map((e) =>{
    
    //         return { type : 'error', message : `Validation Error - ${e.path} field already in use!`};
    //       });
    //       console.log('ARRAY O ERRORS', errors);
    
    //       res.json({ requestType : 'POST', success : false, error : errors });
    //     });
      
    //   // Otherwise, use existing entry
    //   }else{
    //     res.status(200).send({
    //       success: true,
    //       message: `You are logged in as ${decoded['cognito:username']}`,
    //       token: decoded
    //     });
    //   }
    // });

    
  });

});

router.post('/logged-in', function(req, res, next){
  jwt.verify(req.body.token, pem, { algorithms: ['RS256'] }, function(err, decoded) {
    console.log('decoded token',decoded)

    res.status(200).send({
      success: true,
      message: `You are logged in as ${decoded['cognito:username']}`,
      token: decoded
    });
    
  });
   
   
 
});
module.exports = router;