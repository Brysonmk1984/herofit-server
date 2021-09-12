const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const verifyRecaptcha = require("../lib/verifyRecaptcha");
const { authenticateJWT } = require('../jwt/validateJWT');
const issueJWT = require('../jwt/issueJWT');
const { User } = require('../config/db');
const { config } = require('../appConfig');
const latestPatchDetails = require('../patchDetails/latest.json');
const { genPassword, validatePassword } = require('../lib/passwordUtils');
const { randomEmailString, usePasswordHashToMakeToken } = require('../lib/passwordUtils');
const { sendVerificationEmail, sendResetPasswordEmail } = require('../mail');

// mobile app only
const heroList = require('../heroList.json');
const crypto = require('crypto');

router.post('/login', body('email').isEmail(), body('password').isString({ min: 8, max: 25 }), (req, res)=>{
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    return res.formatter.badRequest(errors.array(), "Validation Error - for POST /login");
  }

  if(config.mode === 'maintenance'){
    return res.formatter.serviceUnavailable('Server is down for maintenance, please try again later...');
  }
  const { email, password } = req.body;

  User.findOne({ where : { email }, raw : true })
  .then((user) =>{
    if(!user){
      return res.formatter.unauthorized(`Couldn't find a user with that email.`);
    }else if(!user.hash){
      return res.formatter.unauthorized({ oldUserMigration : true, message : 'HeroFit has upgraded to a new login system. Please verify your account.' });
    }

    const isValid = validatePassword(password, user.hash, user.salt);
    if(isValid){
      const tokenObject = issueJWT(user);
      //console.log(tokenObject);
      if(!user.active){
        return res.formatter.ok({ user : { active : false }, tokenObject });
      }
      return res.formatter.ok({ user, tokenObject });
    }else{
      return res.formatter.unauthorized(`Incorrect password, please try again.`);
    }

  }).catch((error) =>{
    console.log('Passport Auth error - ', error);
    res.formatter.serverError(error.toString(), `Error Logging in User - for POST /login`);
  })

});

// captchaValue is optional since App isn't using it
router.post('/register', body('email').isEmail(), body('firstName').isString(), body('username').isString({ min: 3, max: 25 }), body('password').isString({ min: 8, max: 25 }), body('emailMarketingOptIn').isBoolean(), body('captchaValue').isString().optional({nullable: true, checkFalsy: true}), body('isMobileApp').isBoolean().optional({nullable: true, checkFalsy: true}), (req, res)=>{
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    return res.formatter.badRequest(errors.array(), "Validation Error - for POST /register");
  }

  if(config.mode === 'maintenance'){
    return res.formatter.serviceUnavailable('Server is down for maintenance, please try again later...');
  }


  // Skip Recaptcha if development mode
  const successfulRecaptcha =  process.env.NODE_ENV === 'development' ? true : verifyRecaptcha(req.body.captchaValue);
  if(!successfulRecaptcha){
    return res.formatter.badRequest(null, "The captcha deemed you are a bot; If you're a human, please try again.");
  }

  let { email, username, password, firstName, lastName, emailMarketingOptIn, isMobileApp } = req.body;
  fistName = firstName || null;
  lastName = lastName || null;
  const saltHash = genPassword(password);
  const { salt, hash } = saltHash;
  const emailCode =  randomEmailString();

  const newUser = { 
    email,
    username,
    firstName,
    lastName,
    hash,
    salt,
    emailCode,
    emailMarketingOptIn
  };

  User.create(newUser)
  .then((result) => {
    // Not sure why sequelize can't do raw : true, so we need this:
    const user = result.get({ plain : true });

    const tokenObject = issueJWT(user);
    const response = { user, tokenObject };

    if(config.globalMessage && config.globalMessage.length){
      response.globalMessage = config.globalMessage;
    }


    sendVerificationEmail(email, emailCode, isMobileApp)
    .then((data) =>{
      //console.log(data);
      if(data.error){
        return res.formatter.serverError(error.toString());
      }

      console.log('sending OK RESPONSE');
      return res.formatter.ok(response);
    }).catch((error) =>{
      console.log('THE ERROR', error);
    });


  }).catch((error)=>{
    console.log(`Couldn't create user ${email}, DEBUG: ${error}`);
    const uniqueConstraint = `SequelizeUniqueConstraintError: Validation error`;
    if(error.toString() === uniqueConstraint){console.log('YEP, UNIQUE EMAIL VIOLATION');
      const emailTakenMessage = "That email is already in use. Have you already registered? Try logging in instead.";
      return res.formatter.badRequest(emailTakenMessage, `Email already in use ${email} - for POST /register`);
    }
    res.formatter.serverError(error.toString(), `Couldn't create user ${email} - for POST /register`);
  });

});

router.post('/reset-password-confirm-email', body('email').isEmail(), (req, res)=>{
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    return res.formatter.badRequest(errors.array(), "Validation Error - for POST /reset-password-confirm-email");
  }
  const { email } = req.body;

  User.findOne({ where : { email }, attributes: [ "email", "hash", "createdAt" ], raw : true })
  .then((result) =>{
    //console.log('DB email result = ', result);
    if(result){
      const token = usePasswordHashToMakeToken(result);
      sendResetPasswordEmail(email, token)
      .then((result) =>{
        //console.log(result);
        return res.formatter.ok({ result });
      }).catch((error) =>{
        console.log('Error', error);
        res.formatter.serverError(error.toString(), "Server Error Sending Email - for POST /reset-password-confirm-email");
      });
    }else{
      return res.formatter.badRequest("No matching email.");
    }
    
  }).catch((error) =>{
    res.formatter.serverError(error.toString(), "Server Error - for POST /reset-password-confirm-email");
  });

});

router.post('/reset-password', body('email').isEmail(), body('token').isString(), body('password').isString({ min: 8, max: 25 }), (req, res)=>{
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    return res.formatter.badRequest(errors.array(), "Validation Error - for POST /reset-password");
  }

  const { email, token, password } = req.body;
  
  User.findOne({ where : { email }, attributes: [ "email", "hash", "createdAt", "active", "emailCode" ], raw : true })
  .then((result) =>{
    if(result){
      const { hash, createdAt, active, emailCode } = result;
      const secret = hash + "-" + createdAt;
      const payload = jwt.decode(token, secret);
      if (payload.email === email) {
        const saltHash = genPassword(password);
        const { salt, hash } = saltHash;
        const updateObj = { salt, hash };
        
        // Legacy Users migrating to new Auth System
        if(!active && !emailCode){
          updateObj.active = true;
          updateObj.emailCode = 'legacy-user';
        }
      
        User.update(updateObj, { where : { email }})
        .then((result) =>{
          if(!result[0]){
            const error = new Error('No matching Email');
            return res.formatter.badRequest(error.toString());
          }
          return res.formatter.ok();
        }).catch((error) =>{
          console.log('ERROR', error);
          res.formatter.serverError(error.toString(), 'Unable to update Password');
        });
      }else{
        res.formatter.badRequest('Email Mismatch!');
      }
    }else{
      return res.formatter.badRequest("No matching email.");
    }
  });

});



router.post('/resend-email-confirmation', body('email').isEmail(), body('emailCode').isString().optional({nullable: true, checkFalsy: true}), body('isMobileApp').isBoolean().optional({nullable: true, checkFalsy: true}), (req, res) => {
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    return res.formatter.badRequest(errors.array(), "Validation Error - for POST /resend-email-confirmation");
  }
  
  let { email, emailCode, isMobileApp } = req.body;



  // If no emailCode, it means the user is trying to activate their account at a later date. In this case, generate a new emailCode since they don't have an emailCode saved in a JWT
  if(!emailCode){
    emailCode = randomEmailString();
    User.update({ emailCode }, { where : { email }});
  }

  //console.log(email, emailCode);
  sendVerificationEmail(email, emailCode, isMobileApp)
  .then((data) => {
    if(data.error){
      return res.formatter.serverError(error.toString());
    }

    return res.formatter.ok({});
  }).catch((error) => {
    console.log('THE ERROR', error);
    return res.formatter.serverError(error.toString(), "SERVER Error - for POST /resend-email-confirmation");
  });

});

router.post('/validated-email', body('emailCode').isString(), (req, res) =>{
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    return res.formatter.badRequest(errors.array(), "Validation Error - for POST /validated-email");
  }

  const { emailCode } = req.body;
  console.log('EMAILCODE', emailCode);
  User.update({ active : true }, { where : { emailCode }, returning : true, plain : true })
  .then((data) => {
    console.log('IM IN', data[1]);
    return res.formatter.ok({ user : data[1] });
  }).catch((error) => {
    console.log(error);
    return res.formatter.serverError(error.toString(), "SERVER Error - for POST /validated-email");
  });

});

router.get('/strava-client-credentials', authenticateJWT, (req, res) =>{
 
  res.formatter.ok({
    clientId: process.env.STRAVA_CLIENT_ID,
    clientSecret: process.env.STRAVA_CLIENT_SECRET,
    redirectUri : process.env.NODE_ENV === 'production' ? process.env.STRAVA_REDIRECT_PROD : process.env.NODE_ENV === 'staging' ?  process.env.STRAVA_REDIRECT_STAGING : process.env.STRAVA_REDIRECT_DEV
  });
});

router.post('/strava-credentials', body('email').isEmail(), body('stravaAccessToken').isString(), body('stravaAccessTokenExpiration').isNumeric(), body('stravaRefreshToken').isString(), body('dataSrcId').exists().optional(), authenticateJWT, (req, res) =>{
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    return res.formatter.badRequest(errors.array(), "Validation Error - for /strava-credentials");
  }
 
  const { email, stravaAccessToken, stravaAccessTokenExpiration, stravaRefreshToken, dataSrcId } = req.body;

  const updateObj = { stravaAccessToken, stravaAccessTokenExpiration, stravaRefreshToken };
  if(dataSrcId){
    updateObj.dataSrcId = dataSrcId;
  }

  User.findOne({ where: { email } })
  .then((user) =>{
    // Check if record exists in db
    if (user) {
      User.update(
        updateObj,
        { where: { email },
        returning : true, plain : true })
      .then((data) => {
        res.formatter.ok({
          user : data[1]
        });
      })
      .catch((error)=>{
        console.log(`Couldn't update Strava tokens for user ${email}, DEBUG: ${error}`);

        const errorString = error.toString();
        console.log('ERR STR = ', errorString)
        // If dataSrcId is already in use, send bad request
        if(errorString === 'SequelizeUniqueConstraintError: Validation error'){
          res.formatter.badRequest(errorString, `That Strava Account is Already in use! You can unlink a Strava Account from the Account Page of the other HeroFit account.`);
        }else{
          res.formatter.serverError(errorString, `Couldn't update Strava tokens for user ${email}`);
        }
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

router.post('/disconnect-strava', body('email').isEmail(), authenticateJWT, (req, res) => {
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    return res.formatter.badRequest(errors.array(), "Validation Error - for POST /disconnect-strava");
  }
  const { email } = req.body;

  User.update({ stravaAccessToken : null, stravaAccessTokenExpiration : null, stravaRefreshToken : null, dataSrcId : null }, { where : { email }})
  .then((result) =>{
    console.log(result);
    return res.formatter.ok();
  }).catch((error) =>{
    console.log(`Couldn't Disconnect Strava for account email ${email}`);
    res.formatter.serverError(error.toString(), "Database or server code error for POST /disconnect-strava");
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

router.post('/update-seen-latest-patch', body('id').isNumeric(), authenticateJWT, (req, res) => {
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
    return { character : heroData.character, alias : heroData.alias, description : heroData.description, history : heroData.history, image : heroData.image,
      elms : heroData.elms, colors : heroData.colors
    }
  })
  res.formatter.ok(heroListForApp);
});

// If a user opts to do 'manual mode' instead of strava, use this endpoint to generate a dataSrcId
router.post('/generate-datasrcid', body('email').isEmail(), authenticateJWT, (req, res) =>{
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    return res.formatter.badRequest(errors.array(), "Validation Error - for /non-strava-credentials");
  }
 
  const { email } = req.body;

  User.findOne({ where: { email } })
  .then((user) =>{
    // Check if record exists in db
    if (user) {
      User.update(
        {  dataSrcId : `hf-${crypto.randomBytes(4).toString('hex')}` },
        { where: { email },
        returning : true, plain : true })
      .then((data) => {
        res.formatter.ok({
          user : data[1]
        });
      })
      .catch((error)=>{
        console.log(`Couldn't update dataSrcId for user ${email}, DEBUG: ${error}`);
        const errorString = error.toString();
        console.log('ERR STR = ', errorString)
        // If dataSrcId is already in use, send bad request
        if(errorString === 'SequelizeUniqueConstraintError: Validation error'){
          res.formatter.badRequest(errorString, `That dataSrcId is already in use!`);
        }else{
          res.formatter.serverError(errorString, `Couldn't update dataSrcId for user ${email}`);
        }
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

module.exports = router;

