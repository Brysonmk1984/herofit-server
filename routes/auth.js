const router = require('express').Router();
const passport = require('passport');
const { genPassword, validatePassword } = require('../lib/passwordUtils');
const { User } = require('../config/db');
const { body, header, validationResult } = require('express-validator');
const { authenticateJWT } = require('../jwt/jwtValidation');
const issueJWT = require('../jwt/issueJWT');
const { config } = require('../appConfig');

//db connection

router.get('/protected', passport.authenticate('jwt', { session : false }), (req, res) =>{
  res.formatter.ok('SUCCESS!');
});

router.post('/login', (req, res)=>{
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    return res.formatter.badRequest(errors.array(), "Validation Error - for /signup-or-signin");
  }

  if(config.mode === 'maintenance'){
    return res.formatter.serviceUnavailable('Server is down for maintenance, please try again later...');
  }

  const { email, password } = req.body;


  User.findOne({ where : { email }, raw : true })
  .then((user) =>{
    if(!user){
      res.formatter.unauthorized(`Couldn't find a user with that email.`);
    }

    const isValid = validatePassword(password, user.hash, user.salt);
    if(isValid){
      const tokenObject = issueJWT(user);
      res.formatter.ok({ user, tokenObject });
    }else{
      res.formatter.unauthorized(`Incorrect password, please try again.`);
    }

  }).catch((error) =>{
    console.log('Passport Auth error - ', error);
    res.formatter.serverError(error.toString(), `Error Authenticating User!`);
  })

});

router.post('/register', (req, res)=>{
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    return res.formatter.badRequest(errors.array(), "Validation Error - for /signup-or-signin");
  }

  if(config.mode === 'maintenance'){
    return res.formatter.serviceUnavailable('Server is down for maintenance, please try again later...');
  }

  const { email, username, password, firstName, lastName } = req.body;

  const saltHash = genPassword(password);
  const salt = saltHash.salt;
  const hash = saltHash.hash;

  const newUser = { 
    email,
    // The new frontend should give the user an option for their display name, which is auto populated with firstName & last initial (Bryson K)
    username,
    firstName,
    lastName,
    hash,
    salt 
  };

  

  User.create(newUser)
  .then((result) => {
    // Not sure why sequelize can't do raw : true, so we need this:
    const user = result.get({ plain : true });

    const jwt = issueJWT(user);
    const response = { user, ...jwt };

    if(config.globalMessage && config.globalMessage.length){
      response.globalMessage = config.globalMessage;
    }
    return res.formatter.ok(response);

  }).catch((error)=>{
    console.log(`Couldn't create user ${email}, DEBUG: ${error}`);
    res.formatter.serverError(error.toString(), `Couldn't create user ${email}`);
  });

});

router.get('/logout', authenticateJWT, (req, res) => {
  req.logout();
  res.formatter.ok();
});

module.exports = router;