const express = require('express');
const router = express.Router(); 
const User = require('../db').User;
const passport = require('passport');

router.get('/logged-in', function(req, res, next){

  
  passport.authenticate('jwt', { session : false }, (err, data) => {
    //console.log('in jwt auth');
    if(err){
      console.log(err);
      res.status(401).send('There was an error with JWT');
      return;
    }
    //console.log('USER', data.dataValues);
    const user = data.dataValues;
    if (err) return next(err);
    //res.header('Access-Control-Allow-Credentials', 'true');
    //const token = jwt.sign({ email : u.email }, process.env.JWTSECRET);
    res.status(200).send({
      success: true,
      message: `You are logged in as ${user.username}`,
      email: user.email,
      username : user.username,
      publicEthKey : user.publicEthKey,
      fullAccount : user.fullAccount,
      //token
    });
    next();

  })(req, res, next);
});

module.exports = router;