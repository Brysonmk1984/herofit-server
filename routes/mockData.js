const express = require('express');
const router = express.Router(); 
const moment = require('moment');
const AppMode = require('../appConfig').config.mode;
const mockAccounts = require('../mockData/mockData');
const mockUsernames = require('../mockData/mockUsernames');
const mockActivities = require('../mockData/mockActivities');
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

  const entries = activities.map((activity) =>{
    activity.start_date = moment.utc().format('YYYY-MM-DDTHH:mm:ss');
    activity.start_date_local = moment().format('YYYY-MM-DDTHH:mm:ssZ');

    return { user : req.body.email,  activity : JSON.stringify(activity), activityDate : activity.start_date };
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

// Get mock accounts from JSON file and return to front end
router.get('/create-random-account', function(req, res, next){

  if(mockAccounts){
    const newMockUser = shuffleArray(mockAccounts.filter(acc => acc.inUse === false))[0];
    let username;
    
    if(newMockUser.firstName || newMockUser.lastName ){
      username = `${newMockUser.firstName} ${newMockUser.lastName}`;
    }else{
      username = shuffleArray(mockUsernames)[0];
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
          redirectUri : process.env.NODE_ENV === 'production' ? process.env.STRAVA_REDIRECT_PROD : process.env.STRAVA_REDIRECT_DEV, 
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
          redirectUri : process.env.NODE_ENV === 'production' ? process.env.STRAVA_REDIRECT_PROD : process.env.STRAVA_REDIRECT_DEV, 
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
            username : shuffleArray(mockUsernames)[0],
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
    name : shuffleArray(mockUsernames)[0],
    character : selection.character,
    power : 100,
    health : 100,
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
    qp : 5,
    qpRecovery : 0,qpArmor : 0,qpPower : 0,qpItems : 0,qpFire : 0,qpEarth : 0,qpWater : 0,qpAir : 0,
  };
  randomHero[elmRandom] += 5;

  console.log('INSERTING AV', randomHero);

  if(AppMode === 'alpha'){console.log('HAS PET');
  randomHero.pets.push({type : 'passive', name: 'Alpha Dog', description: 'Reward for being an Alpha Tester'})
  }

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
      skills: JSON.stringify(randomHero.skills),
      items: JSON.stringify(randomHero.items),
      titles: JSON.stringify(randomHero.titles),
      pets: JSON.stringify(randomHero.pets),
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
    const avatar = result[0].dataValues;
    avatar.items = JSON.parse(avatar.items);
    avatar.skills = JSON.parse(avatar.skills);
    avatar.titles = JSON.parse(avatar.titles);
    avatar.pets = JSON.parse(avatar.pets);
    // Non-Whole numbers come out of DB as strings, so need to convert to numbers here
    avatar.fire = JSON.parse(avatar.fire);
    avatar.earth = JSON.parse(avatar.earth);
    avatar.air = JSON.parse(avatar.air);
    avatar.water = JSON.parse(avatar.water);
    avatar.recovery = JSON.parse(avatar.recovery);
    avatar.armor = JSON.parse(avatar.armor);
    // New Avatar Created
    if(created){
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
      debug : err
    });
    next();
  }
});

module.exports = router;