const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { authenticateJWT } = require('../jwt/validateJWT');
const issueJWT = require('../jwt/issueJWT');
const { User } = require('../config/db');
const { config } = require('../appConfig');
const latestPatchDetails = require('../patchDetails/latest.json');
const { genPassword, validatePassword } = require('../lib/passwordUtils');
// mobile app only
const heroList = require('../heroList.json');

router.post('/login', (req, res)=>{
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
    res.formatter.serverError(error.toString(), `Error Logging in User - for POST /login`);
  })

});

router.post('/register', (req, res)=>{
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    return res.formatter.badRequest(errors.array(), "Validation Error - for POST /register");
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
    res.formatter.serverError(error.toString(), `Couldn't create user ${email} - for POST /register`);
  });

});

router.get('/logout', (req, res) => {
  req.logout();
  res.formatter.ok();
});


router.get('/strava-client-credentials', authenticateJWT, (req, res) =>{
  res.formatter.ok({
    clientId: process.env.STRAVA_CLIENT_ID,
    clientSecret: process.env.STRAVA_CLIENT_SECRET,
    redirectUri : process.env.NODE_ENV === 'production' ? process.env.STRAVA_REDIRECT_PROD : process.env.NODE_ENV === 'staging' ?  process.env.STRAVA_REDIRECT_STAGING : process.env.STRAVA_REDIRECT_DEV
  });
});

router.post('/strava-credentials', body('email').isEmail(), body('stravaAccessToken').isString(), body('stravaAccessTokenExpiration').isNumeric(), body('stravaRefreshToken').isString(), authenticateJWT, (req, res) =>{
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    return res.formatter.badRequest(errors.array(), "Validation Error - for /strava-credentials");
  }

  console.log('!!! headers sent to strava-credentials', req.headers, req.headers.authorization);
  const { email, stravaAccessToken, stravaAccessTokenExpiration, stravaRefreshToken } = req.body;
  User.findOne({ where: { email } })
  .then((user) =>{
    // Check if record exists in db
    if (user) {
      User.update(
        { stravaAccessToken, stravaAccessTokenExpiration, stravaRefreshToken },
        { where: { email },
        returning : true, plain : true })
      .then((data) => {
        res.formatter.ok({
          user : data[1]
        });
      })
      .catch((error)=>{
        console.log(`Couldn't update Strava tokens for user ${email}, DEBUG: ${error}`);
        res.formatter.serverError(error.toString(), `Couldn't update Strava tokens for user ${email}`);
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

router.post('/update-seen-latest-patch', body('id').isNumeric(), authenticateJWT, (req, res) =>{
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
    return { character : heroData.character, alias : heroData.alias, description : heroData.description, history : heroData.history,
      fire : heroData.elms.fire, earth : heroData.elms.earth, water  : heroData.elms.water, air : heroData.elms.air
    }
  })

  res.formatter.ok(heroListForApp);
});

module.exports = router;

