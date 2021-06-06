const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateAdminJWT } = require('../jwt/validateJWT');
const router = express.Router(); 
const fs = require('fs');
const path = require("path");
const moment = require('moment');
const { shuffleArray, parseAvatarProperties, getRandomNumber } = require('../lib/helperFunctions');
const { User, UserActivity, Avatar } = require('../config/db');
const db = require('../config/db').db;
// MOCK DATA
const mockAvatarNames = require('../mockData/mockAvatarNames');
const mockActivities = require('../mockData/mockActivities');
const heroList = require('../heroList');


// Create fake account from passed COGNITO EMAIL and return to front end
router.post('/create-cognito-linked-account', body('email').isEmail(), body('firstName').isLength({min:0, max: 30}).optional({ checkFalsy: true }), body('lastName').isLength({min:0, max: 30}).optional({ checkFalsy: true }),  authenticateAdminJWT, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for create-cognito-linked-account endpoint");
  }

  // Create username form firstname and lastname, or assign one
  let username;
  if(req.body.firstName || req.body.lastName ){
    username = `${req.body.firstName} ${req.body.lastName}`.trim();
  }else{
    username = shuffleArray(mockAvatarNames)[0];
  }

  User.findOrCreate({
    where: { email: req.body.email },
    // set the default properties if it doesn't exist
    defaults: { 
      email: req.body.email,
      username : username,
      firstName : req.body.firstName || null,
      lastName : req.body.lastName || null,
      isFake : true
    }
  }).then(function(result) {
    const created = result[1];
    let user = result[0].dataValues;

    // New user, created a new db
    if (created) {
      res.formatter.ok(user), 'New User Created';
    // User already exists, return data from db
    }else{
      console.log('User already exists', user.createdAt);
      res.formatter.ok(user, 'User already Exists');
    }

  }).catch((error)=>{
    // USERNAME IS THE SAME AS SOMEONE ELSES, NEED TO MODIFY IT AND TRY AGAIN
    if(error && error.original.code === '23505'){
      User.create({
          email: req.body.email,
          username : shuffleArray(mockAvatarNames)[0],
          firstName : req.body.firstName || null,
          lastName : req.body.lastName || null
      })
      .then((result) =>{

        // Need to remove mock username
        const namesMinusUsed = JSON.stringify(mockAvatarNames.filter((avName) => avName !== user.username));
        fs.writeFileSync(path.resolve(__dirname,'../mockData/mockAvatarNames.json'), namesMinusUsed);

        let user = result.dataValues;
        res.formatter.ok(user, 'Username was already taken, just use a mock name instead');
      })
      .catch((error) =>{
        console.log('error', error);
        res.formatter.serverError(error.toString(), 'Couldnt use or make a username for user.');
      })
    }else{
      console.log(`Couldn't find or create user ${req.body.email}, DEBUG: ${error}`);
      res.formatter.serverError(error.toString(), 'Unable to find or create a user.');
    }
  });
});

// Insert random avatar after cognito account was created
router.post('/insert-random-avatar', body('owner').isEmail(), authenticateAdminJWT, (req,res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for /insert-random-avatar endpoint");
  }

  const selection = shuffleArray(heroList)[0];
  const elmRandom = shuffleArray(['fire', 'earth', 'water', 'air'])[0];

  const randomHero = {
    name : shuffleArray(mockAvatarNames)[0],
    character : selection.character,
    power : 100,
    health : 100,
    maxHealth : 100,
    fire : selection.elms.fire,
    earth : selection.elms.earth,
    air : selection.elms.air,
    water : selection.elms.water,
    recovery : 0,
    armor : 0,
    activityXP : 0,
    battleXP : 0,
    qp : 0,
    qpRecovery : 0,qpArmor : 0,qpPower : 0,qpFire : 0,qpEarth : 0,qpWater : 0,qpAir : 0, qpHealth : 0,
  };
  // Elemental bonus
  randomHero[elmRandom] += 5;


  const attrArray = ['Power','Recovery','Armor','Fire', 'Earth', 'Water', 'Air'];
  const spendQPArray = [1,2,3,4,5,6,7,8,9,10,0,0,0,0,0,0,0,0,0,0];

  // Set random starting xp
  randomHero.activityXP = Math.floor(Math.random() * (850 - 0));
  const isLevel = (99 < randomHero.activityXP < 228) ? 2 : randomHero.activityXP < 370 ? 3 : randomHero.activityXP < 523 ? 4 : randomHero.activityXP < 683 ? 5 :randomHero.activityXP < 850 ? 6 : 1;
  if(isLevel === 2){
    spendQPArray.push(11,12,13,14,15);
  }else if(isLevel === 3){
    spendQPArray.push(11,12,13,14,15,16,17,18,19,20);
  }else if(isLevel === 4){
    spendQPArray.push(11,12,13,14,15,16,17,18,19,20, 21, 22, 23, 24, 25);
  }else if(isLevel === 5){
    spendQPArray.push(11,12,13,14,15,16,17,18,19,20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30);
  }else if(isLevel === 6){
    spendQPArray.push(11,12,13,14,15,16,17,18,19,20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35);
  }
  
  // Randomly spend QP
  const randomSpentQpNum = shuffleArray(spendQPArray)[0];
  for(let i = 0; i < randomSpentQpNum; i++){
    const attr = shuffleArray(attrArray)[0];
    randomHero[attr.toLowerCase()] += 1;
    randomHero[`qp${attr}`] += 1;
  }

  console.log('INSERTING AV', randomHero);

  Avatar.findOrCreate({
    where: {
      owner: randomHero.owner
    },
    // set the default properties if it doesn't exist
    defaults: { 
      isFake : true,
      owner: req.body.owner,
      name: randomHero.name,
      character: randomHero.character,
      power: randomHero.power,
      health: randomHero.health,
      fire : randomHero.fire,
      earth : randomHero.earth,
      air : randomHero.air,
      water : randomHero.water,
      recovery : randomHero.recovery,
      armor : randomHero.armor,
      activityXP : randomHero.activityXP,
      battleXP : randomHero.battleXP,
      qp : randomHero.qp,
      qpFire : randomHero.qpFire,
      qpEarth : randomHero.qpEarth,
      qpWater : randomHero.qpWater,
      qpAir : randomHero.qpAir,
      qpRecovery : randomHero.qpRecovery,
      qpPower : randomHero.qpPower,
      qpArmor : randomHero.qpArmor,
    }
  }).then((result) =>{
    const created = result[1];
    let avatar = result[0].dataValues;
    // Non-Whole numbers come out of DB as strings, so need to convert to numbers here
    avatar = parseAvatarProperties(avatar);
    // New Avatar Created
    if(created){
      // Need to remove name used for avatar
      const namesMinusUsed = JSON.stringify(mockAvatarNames.filter((avName) => avName !== avatar.name));
      fs.writeFileSync(path.resolve(__dirname,'../mockData/mockAvatarNames.json'), namesMinusUsed);
      
      res.formatter.ok({ avatar });
    // Updated Existing Avatar
    }else{
      res.formatter.ok({ avatarId : avatar.id });
    }
  }).catch((error) =>{
    console.log(`Couldn't insert Avatar for user ${req.body.owner}, DEBUG: ${error}`);
    res.formatter.serverError(error.toString(), 'Unable to Create Avatar for Cognito Linked User');
  });
  
});

// Returns the dummy list of fake activities
router.post('/get-fake-activities',  body('count').isNumeric(), authenticateAdminJWT, (req,res) => {
  const count = req.body.count;
  const activities = shuffleArray(mockActivities).slice(0,count).map((act) =>{
    act.id = getRandomNumber(10);
    return act;
  });
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for get-fake-activities endpoint");
  }

  res.formatter.ok(activities);
});

// BROKEN - integer out of range - Inserts fake activities into account by email
router.post('/insert-mock-activities', body('count').isNumeric(), body('email').isEmail(), authenticateAdminJWT, (req,res) =>{
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for insert-mock-activities");
  }
  const count = req.body.count;
  const activities = shuffleArray(mockActivities).slice(0,count).map((act) =>{
    act.id = getRandomNumber(10);
    return act;
  });
  console.log('INSERTING THIS MANY ACTS - ',activities.length, 'mock acts - ', mockActivities.length, 'couunt', count);
  const entries = activities.map((activity) =>{
    activity.start_date = moment.utc().format('YYYY-MM-DDTHH:mm:ss');
    activity.start_date_local = moment().format('YYYY-MM-DDTHH:mm:ssZ');
    console.log('ASD - ', activity.id);
    return { id: 8001, user : req.body.email,  activity, activityDate : activity.start_date };
  });
  console.log('ENTRIES - ', entries);
  // Add latestActivityUpdate to DB for user
  User.update(
    {latestActivityUpdate : moment.utc(entries[entries.length.start_date]).format('YYYY-MM-DD HH:mm:ss')},
    { where: { email: req.body.email } }
  ).then((result) => {
    console.log('INSERT USER ACTIVITIES',entries);
    // Front end is determining which activities are new, so everything passed here can be added to db.
    return UserActivity.bulkCreate(entries);
  }).then((result) =>{
    console.log('HERE!', result);
    return res.formatter.ok({ activities : req.body.activities });
  }).catch((error)=>{
    console.log('ERR', error);
    res.formatter.badRequest(error.toString(), 'Database Update Error - Unable to bulk insert activities')
  });

});

// Verify the Admin Password is Correct in order to open the Admin panel
router.post('/check-admin-password', body('password').custom((password) =>{
  return password === process.env.ADMIN_PANEL_PASSWORD ? true : false; 
}), authenticateAdminJWT, (req,res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error for check-admin-password endpoint");
  }
  if(process.env.production || process.env.staging){
    if(req.user.email !== process.env.ADMIN_PANEL_EMAIL){
      const error = new Error("Unauthorized user attempted access to admin panel");
      return res.formatter.forbidden(error.toString());
    }
  }

  
  res.formatter.ok({isValid : true});
});


// Manually set Avatar's health and status
router.post('/set-avatar-health-and-status', body('id').isNumeric(), body('health').isNumeric(), body('status').isIn(['Recovering', 'Rested', 'Knocked Out', 'New Recruit']), authenticateAdminJWT,
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.formatter.badRequest(errors.array(), "Validation Error - for set-avatar-health-and-status endpoint");
    }

    return Avatar.update(
      { health : req.body.health, status : req.body.status },
      { where: { id: req.body.id }, returning : true, raw : true }
    ).then((avatar) =>{
      // Shouldn't ever happen
      if(!avatar){
        throw new Error(`No Avatar to set health and status for Avatar ID: ${req.body.id}`);
      }else if(!avatar[1] || !avatar[1][0]){
        throw new Error('Error with Sequelize return formatting.');
      }

      res.formatter.ok({ avatar : parseAvatarProperties(avatar[1][0]) });
    }).catch((error) =>{
      res.formatter.notFound(error.toString(), 'Retrieved Data Error for set-avatar-health-and-status endpoint');
    });
  }
);

// Sets all feedback booleans to sent value
router.post('/toggle-feedback-boolean', body('setToTrue').isBoolean(), authenticateAdminJWT, async (req, res) => {
  const errors = validationResult(req);console.log('ERRS', errors);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for /toggle-feedback-boolean");
  }


  const hasSubmittedFeedback = req.body.setToTrue;
  console.log('HSF - ', hasSubmittedFeedback);
  const query = `UPDATE users SET "featurePreferenceSubmitted"=$1`;

    try{
      const [results, metadata] = await db.query(query, { bind : [hasSubmittedFeedback] });

      console.log('results!', metadata);
      if(results){
        return res.formatter.ok(results);
      }else{
        const error = new Error("No Results for feedback boolean");
        return  res.formatter.serverError(error.toString(), 'Unable to update avatar name - for /update-avatar-name endpoint');
      }
    }catch(error){
      return res.formatter.serverError(error.toString(), 'Unable to update avatar name - for /update-avatar-name endpoint');
    }


});


module.exports = router;