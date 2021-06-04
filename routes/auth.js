const router = require('express').Router();
const passport = require('passport');
const { genPassword } = require('../lib/passwordUtils');
const { User } = require('../config/db');
const { body, header, validationResult } = require('express-validator');
const { authenticateJWT } = require('../jwtValidation');
//db connection

router.post('./login', (req, res)=>{

  passport.authenticate('local')
  .then((user) =>{
    if (!user) { return res.redirect('/login'); }
    const response = { user };
    if(config.globalMessage && config.globalMessage.length){
      response.globalMessage = config.globalMessage;
    }
    return res.formatter.ok(response);
  }).catch((error) =>{
    console.log('Passport Auth error - ', error);
    res.formatter.serverError(error.toString(), `Error Authenticating User!`);
  })






  
});

router.post('./register', (req, res)=>{
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    return res.formatter.badRequest(errors.array(), "Validation Error - for /signup-or-signin");
  }

  if(config.mode === 'maintenance'){
    return res.formatter.serviceUnavailable('Server is down for maintenance, please try again later...');
  }

  const { email, username, password } = req.body;

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

  

  User.findOrCreate({
    where: {
      email: newUser.email
    },
    defaults: newUse,
    raw : true
  }).then((user) => {
    const response = { user };

    if(config.globalMessage && config.globalMessage.length){
      response.globalMessage = config.globalMessage;
    }

    return res.formatter.ok(response);

  }).catch((error)=>{
    console.log('THE ERROR ON REGISTER=', error);
    // USERNAME IS THE SAME AS SOMEONE ELSES, NEED TO MODIFY IT AND TRY AGAIN
    if(error && error.original && error.original.code === '23505'){

      User.create(newUser)
      .then((user) =>{
        const response = { user };
        if(config.globalMessage && config.globalMessage.length){
          response.globalMessage = config.globalMessage;
        }
        return res.formatter.ok(response);
      })
      .catch((error) =>{console.log('error', error);
        res.serverError(error.toString(), `Couldn't find or create user, second attempt in catch ${email}`);
      })
    }else{
      console.log(`Couldn't find or create user ${email}, DEBUG: ${error}`);
      res.serverError(error.toString(), `Couldn't find or create user ${email}`);
    }

});

router.get('/logout', authenticateJWT, (req, res) => {
  req.logout();
  res.formatter.ok();
});