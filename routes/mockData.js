const express = require('express');
const router = express.Router(); 
const fs = require('fs');
const path = require("path");
const moment = require('moment');
const AppMode = require('../appConfig').config.mode;
const mockAccounts = require('../mockData/mockCognitoAccounts');
const mockAvatarNames = require('../mockData/mockAvatarNames');
const mockActivities = require('../mockData/mockActivities');
const { parseAvatarProperties } = require('../helperFunctions');

const heroList = require('../heroList');
const User = require('../db').User;
const UserActivity = require('../db').UserActivity;
const Avatar = require('../db').Avatar;


const shuffleArray = function(array) {
  var currentIndex = array.length, temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}




router.post('/insert-mock-activities', function(req,res,next){
const count = req.body.count;
const activities = shuffleArray(mockActivities).slice(0,count);
  console.log('INSERTING THIS MANY ACTS - ',activities.length, 'mock acts - ', mockActivities.length, 'couunt', count);
  const entries = activities.map((activity) =>{
    activity.start_date = moment.utc().format('YYYY-MM-DDTHH:mm:ss');
    activity.start_date_local = moment().format('YYYY-MM-DDTHH:mm:ssZ');

    return { user : req.body.email,  activity, activityDate : activity.start_date };
  });

  // Add latestActivityUpdate to DB for user
  User.update(
    {latestActivityUpdate : moment.utc(entries[entries.length.start_date]).format('YYYY-MM-DD HH:mm:ss')},
    { where: { email: req.body.email } }
  ).then(() => {

    // Front end is determining which activities are new, so everything passed here can be added to db.
    UserActivity.bulkCreate(entries)
    .then((result) =>{
      console.log('INSERT USER ACTIVITIES',result);
      res.status(200).json({
        message: `Activities added for user ${req.body.email}`,
        activities : req.body.activities
      });
      next();
    }).catch((err)=>{
      console.log(`Error bulk inserting user activities for ${req.body.email} DEBUG: ${err}`);
      res.status(400).json({
        message: `Error bulk inserting user activities for ${req.body.email}`,
        debug : err
      });
      next();
    });



  }).catch((err)=>{
    console.log(`Error updating latest activity to user table for user ${req.body.email} DEBUG: ${err}`);
    res.status(400).json({
      message: `Error updating latest activity to user table for user  ${req.body.email}`,
      debug : err
    });
    next();
  });



});


// Get mock accounts from JSON file and return to front end
router.get('/get-mock-accounts', function(req, res, next){
  if(mockAccounts){
    res.status(200).json({
      mockAccounts
    });
    next();
  }else{
    res.status(500).json({
      message: `Server Error getting Mock Data`
    });
  }
});


// CREATE mock account from passed COGNITO EMAIL and return to front end
router.post('/create-cognito-linked-account', function(req, res, next){

  if(req.body.email){

    let username;
    
    if(req.body.firstName || req.body.lastName ){
      username = `${req.body.firstName} ${req.body.lastName}`;
    }else{
      username = shuffleArray(mockAvatarNames)[0];
    }

    User.findOrCreate({
      where: {
        email: req.body.email
      },
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
        res.status(200).json({
          message: `New user created -  ${user.username}`,
          user
        });
      // User already exists, return data from db
      }else{
        console.log('User already exists', user.createdAt);
        
        res.status(200).json({
          message: `User -   ${user.username}`,
          user
        });
      }
      next();
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
            res.status(200).json({
              message: `You are logged in as ${user.username}`,
              user
            });
        })
        .catch((error) =>{console.log('error', error);
          res.status(400).json({
            message: `Couldn't find or create user, but second attempt in catch ${req.body.email}`,
            debug : error
          });
        })
      }else{
        console.log(`Couldn't find or create user ${req.body.email}, DEBUG: ${error}`);
        res.status(400).json({
          message: `Couldn't find or create user ${req.body.email}`,
          debug : error
        });
        next();
      }
    });
  }else{
    res.status(400).json({
      message: `No Passed email`
    });
  }
});



// Get mock accounts from JSON file and return to front end
router.get('/create-random-account', function(req, res, next){

  if(mockAccounts){
    const newMockUser = shuffleArray(mockAccounts.filter(acc => acc.inUse === false))[0];
    let username;
    
    if(newMockUser.firstName || newMockUser.lastName ){
      username = `${newMockUser.firstName} ${newMockUser.lastName}`;
    }else{
      username = shuffleArray(mockAvatarNames)[0];
    }
    
    

    User.findOrCreate({
      where: {
        email: newMockUser.email
      },
      // set the default properties if it doesn't exist
      defaults: { 
        email: newMockUser.email,
        username : username,
        firstName : newMockUser.firstName || null,
        lastName : newMockUser.lastName || null,
        isFake : true
      }
    }).then(function(result) {
      const created = result[1];
      let user = result[0].dataValues;

      // New user, created a new db
      if (created) {
        user = Object.assign({}, user, {
          clientId : process.env.STRAVA_CLIENT_ID, 
          redirectUri : process.env.NODE_ENV === 'production' ? process.env.STRAVA_REDIRECT_PROD : process.env.NODE_ENV === 'staging' ? process.env.STRAVA_REDIRECT_STAGING : process.env.STRAVA_REDIRECT_DEV, 
          clientSecret : process.env.STRAVA_CLIENT_SECRET,
        });
        res.status(200).json({
          message: `New user created -  ${user.username}`,
          user
        });
      // User already exists, return data from db
      }else{
        console.log('User already exists', user.createdAt);
        
        user = Object.assign({}, user, {
          // !!!dont need these
          clientId : process.env.STRAVA_CLIENT_ID, 
          redirectUri : process.env.NODE_ENV === 'production' ? process.env.STRAVA_REDIRECT_PROD : process.env.NODE_ENV === 'staging' ? process.env.STRAVA_REDIRECT_STAGING : process.env.STRAVA_REDIRECT_DEV, 
          clientSecret : process.env.STRAVA_CLIENT_SECRET,

        });
        res.status(200).json({
          message: `User -   ${user.username}`,
          user
        });
      }
      next();
    }).catch((error)=>{
      // USERNAME IS THE SAME AS SOMEONE ELSES, NEED TO MODIFY IT AND TRY AGAIN
      if(error && error.original.code === '23505'){
        User.create({
            email: newMockUser.email,
            username : shuffleArray(mockAvatarNames)[0],
            firstName : newMockUser.firstName || null,
            lastName : newMockUser.lastName || null
        })
        .then((result) =>{
          let user = result.dataValues;
            user = Object.assign({}, user, {
              clientId : process.env.STRAVA_CLIENT_ID, 
              redirectUri : process.env.NODE_ENV === 'production' ? process.env.STRAVA_REDIRECT_PROD : process.env.STRAVA_REDIRECT_DEV, 
              clientSecret : process.env.STRAVA_CLIENT_SECRET,
            });
            res.status(200).json({
              message: `You are logged in as ${user.username}`,
              user
            });
        })
        .catch((error) =>{console.log('error', error);
          res.status(400).json({
            message: `Couldn't find or create user, but second attempt in catch ${newMockUser.email}`,
            debug : error
          });
        })
      }else{
        console.log(`Couldn't find or create user ${newMockUser.email}, DEBUG: ${error}`);
        res.status(400).json({
          message: `Couldn't find or create user ${newMockUser.email}`,
          debug : error
        });
        next();
      }
    });
  }else{
    res.status(400).json({
      message: `No Mock Accounts`
    });
  }
});

router.post('/insert-random-avatar', function(req,res,next){
  const selection = shuffleArray(heroList)[0];
  const elmRandom = shuffleArray(['fire', 'earth', 'water', 'air'])[0];

  const randomHero = {
    name : shuffleArray(mockAvatarNames)[0],
    character : selection.character,
    power : 100,
    health : 100,
    maxHealth : 100,
    skills : [],
    items : [],
    pets : [],
    titles : [],
    fire : selection.elms.fire,
    earth : selection.elms.earth,
    air : selection.elms.air,
    water : selection.elms.water,
    recovery : 0,
    armor : 0,
    activityXP : 0,
    battleXP : 0,
    qp : 0,
    qpRecovery : 0,qpArmor : 0,qpPower : 0,qpItems : 0,qpFire : 0,qpEarth : 0,qpWater : 0,qpAir : 0, qpHealth : 0,
  };
  // Elemental bonus
  randomHero[elmRandom] += 5;


  const attrArray = ['Power','Recovery','Armor','Fire', 'Earth', 'Water', 'Air'];
  const spendQPArray = [1,2,3,4,5,6,7,8,9,10,0,0,0,0,0,0,0,0,0,0];

  // Set random starting xp
  randomHero.activityXP = Math.floor(Math.random() * (370 - 0));
  const isLevel = randomHero.activityXP < 228 ? 2 : randomHero.activityXP < 370 ? 3 : 1;
  if(isLevel === 2){
    spendQPArray.push(11,12,13,14,15);
  }else if(isLevel === 3){
    spendQPArray.push(11,12,13,14,15,16,17,18,19,20);
  }
  
  // Randomly spend QP
  const randomSpentQpNum = shuffleArray(spendQPArray)[0];
  for(let i = 0; i < randomSpentQpNum; i++){
    const attr = shuffleArray(attrArray)[0];
    randomHero[attr.toLowerCase()] += 1;
    randomHero[`qp${attr}`] += 1;
  }

  if(AppMode === 'beta'){
    randomHero.pets.push({type : 'passive', name: 'Betta Fish', description: 'Reward for being an Beta Tester'});
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
      ownerUsername: req.body.username,
      name: randomHero.name,
      character: randomHero.character,
      power: randomHero.power,
      health: randomHero.health,
      skills: randomHero.skills,
      items: randomHero.items,
      titles: randomHero.titles,
      pets: randomHero.pets,
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
      qpItems : randomHero.qpItems,
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
      
      res.status(200).json({
        message: `New Avatar Saved belonging to owner ${avatar.owner}`,
        avatarId : avatar.id,
        avatar,
        hasAvatar : true
      });
    // Updated Existing Avatar
    }else{
      res.status(200).json({
        message: `Existing Avatar updated belonging to owner ${avatar.owner}`,
        avatarId : avatar.id,
        hasAvatar : true
      });
    }
    
    next();
  }).catch((err) =>{
    console.log(`Couldn't insert Avatar for user ${req.body.email}, DEBUG: ${err}`);
    res.status(400).json({
      message: `Couldn't insert Avatar for user ${req.body.email}`,
      debug : err
    });
    next();
  });
});

router.post('/get-fake-activities', function(req,res,next){
  const count = req.body.count;
  const activities = shuffleArray(mockActivities).slice(0,count);

  if(activities){
    res.status(200).json({
      activities
    });
    next();
  }else{
    res.status(400).json({
      message: `Error updating latest activity to user table for user  ${req.body.email}`,
      debug : null
    });
    next();
  }
});


router.post('/check-admin-password', function(req,res,next){


  if(req.body.password === process.env.ADMIN_PANEL_PASSWORD){
    res.status(200).json({
      isValid : true
    });
    next();
  }else{
    res.status(400).json({
      message: `Invalid Password`,
      debug : null
    });
    next();
  }
});

router.post('/set-avatar-health-and-status', function(req, res, next){
  return Avatar.update(
    { health : req.body.health, status : req.body.status },
    { where: { id: req.body.id }, returning : true, raw : true }
  ).then((avatar) =>{console.log('REW',avatar[1]);
    res.status(200).json({
      avatar : parseAvatarProperties(avatar[1][0])
    });
  }).catch((error) =>{
    console.log('ERROR UPDATING AVATAR', error);
    res.status(400).json({
      message : `ERROR UPDATING AVATAR - ${error}`,
    });
    next();
  });

});


module.exports = router;