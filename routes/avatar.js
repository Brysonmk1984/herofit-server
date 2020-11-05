const express = require('express');
const router = express.Router(); 
const Avatar = require('../db').Avatar;
const UserTotal = require('../db').UserTotal;
const AppMode = require('../appConfig').config.mode;
const { parseAvatarProperties } = require('../helperFunctions');
const { COMPETITIVE_ACTIVITIES, NONCOMPETITIVE_ACTIVITIES } = require('../game/constants');
const avCalc = require('../game/upgrades/avCalc');
const xpCalc = require('../game/upgrades/xpCalc');


router.post('/insert-avatar', function(req, res, next){
  console.log('INSERTING AV', req.body.avatar);

  if(AppMode === 'beta'){
    req.body.avatar.pets.push({type : 'passive', name: 'Betta Fish', description: 'Reward for being a Beta Tester'})
  }

  Avatar.findOrCreate({
    where: {
      owner: req.body.owner
    },
    // set the default properties if it doesn't exist
    defaults : Object.assign({},{ ...req.body.avatar }, { ownerUsername: req.body.ownerUsername, owner: req.body.email })
  }).then((result) =>{
    const created = result[1];
    // Avatar from results, parse properties that are strings that need to be numbers
    avatar = parseAvatarProperties(result[0].dataValues);
    avatar.restedEnough = avatar.maxHealth * .8 <= avatar.health;
    // Avatar Created
    if(created){
      res.status(200).json({
        message: `New Avatar Saved belonging to owner ${avatar.owner}`,
        avatarId : avatar.id,
        avatar,
        hasAvatar : true
      });
      next();
    // Avatar Already exists, using existing instead
    }else if(!created){
      console.log('AVATAR ALREADY EXISTS - ', avatar);
      res.status(200).json({
        message: `Existing avatar for ${avatar.owner}`,
        avatarId : avatar.id,
        avatar,
        hasAvatar : true
      });
      next();
    }else{
      throw new Error("Couldn't find or create avatar");
    }
  }).catch((err) =>{
    console.log(`Couldn't insert Avatar for user ${req.body.email}, DEBUG: ${err}`);
    res.status(400).json({
      message: `Couldn't insert Avatar for user ${req.body.email}`,
      debug : err
    });
    next();
  });
});

router.post('/update-avatar', function(req, res, next){
  delete req.body.restedEnough;
  Avatar.update(
    {...req.body.avatar},
    { where: { owner: req.body.email }, raw : true }
  )
  .then(function(result) {
    res.status(200).json({
      message: `${result} record updated --- avatar ${req.body.id}`,
    });
  })
  .catch((err) =>{
    console.log(`Error updating avatar for user ${req.body.email}, DEBUG: ${err}`);
    res.status(400).json({
      message: `Couldn't get Avatar for user ${req.body.email}`,
      debug : err
    });
    next();
  });
});

router.post('/buff-and-update-avatar', function(req, res, next){
  let ut;
  let avStatSnapshot;
  let aXPDiff;
  let lvlUp;
  let lvlAfterBuff;
  let qpe;
  delete req.body.restedEnough;
  
  // First, retrieve userTotals AND avatar from DB
  UserTotal.findOne(
    { where: { user: req.body.email }, attributes: [...COMPETITIVE_ACTIVITIES, ...NONCOMPETITIVE_ACTIVITIES], raw : true }
  ).then((userTotals) =>{
    ut = userTotals;
    
    return Avatar.findOne(
      { where: { owner: req.body.email }, attributes : ['character', 'createdAt','activityXP', 'battleXP', 'power', 'fire', 'earth', 'water', 'air', 'qpFire', 'qpEarth', 'qpWater', 'qpAir', 'qp'], raw : true }
    );
  }).then((avatar) =>{
    avStatSnapshot = Object.assign({}, {activityXP : avatar.activityXP, power : avatar.power, fire : avatar.fire, earth : avatar.earth, water : avatar.water, air : avatar.air});
    
    // Then, Update Avatar Totals
    const { checkLevelUp, calcNewActivityXPFromUt, currentLevelByInput } = xpCalc(avatar.activityXP, avatar.battleXP);
    const { updatePower, updateElements } = avCalc(ut);
    
    
    // Updated aXP
    const aXP = calcNewActivityXPFromUt(ut);
    aXPDiff = aXP - avStatSnapshot.activityXP;

    const { leveledUp, endingLevel, qpEarned } = checkLevelUp(aXPDiff);
    lvlUp = leveledUp;
    lvlAfterBuff = endingLevel;
    qpe = qpEarned;

    const updatedPower = updatePower();
    const { fire, earth, water, air } = updateElements(avatar.character, { qpFire : avatar.qpFire, qpEarth : avatar.qpEarth, qpWater : avatar.qpWater, qpAir : avatar.qpAir }, avatar.createdAt);
    const updatedAvatar = Object.assign({}, avatar, { activityXP : aXP, qp: (avatar.qp + qpEarned), power : updatedPower, fire, earth, water, air, hasBeenUpgraded : true });
    
    // Finally, Update Avatar in DB
    return Avatar.update(
      {...updatedAvatar},
      { where: { owner: req.body.email }, returning: true, plain: true }
    );

  }).then((result) =>{
    let avatar = parseAvatarProperties(result[1]);
    avatar.restedEnough = avatar.maxHealth * .8 <= avatar.health;
    // Calc gains here to be displayed on frontend
    const improvements = {
      power : Math.floor(avatar.power - avStatSnapshot.power),
      air : Math.floor(avatar.air - avStatSnapshot.air),
      water : Math.floor(avatar.water - avStatSnapshot.water),
      fire : Math.floor(avatar.fire - avStatSnapshot.fire),
      earth : Math.floor(avatar.earth - avStatSnapshot.earth),
    };
    console.log('LVL UP - ', lvlUp, 'REACHEDLEVEL - ', lvlAfterBuff, 'QPE - ', qpe);

    res.status(200).json({
      avatar,
      improvements,
      reachedLevel : lvlUp ? lvlAfterBuff : null,
      qpEarned : qpe,
      xpGain : aXPDiff,
    });
  }).catch((err) =>{
    console.log(`Error updating avatar for user ${req.body.email}, DEBUG: ${err}`);
    res.status(400).json({
      message: `Couldn't get Avatar for user ${req.body.email}`,
      debug : err
    });
    next();
  });

});

router.post('/get-avatar', function(req, res, next){
  Avatar.findOne({ where: { owner: req.body.email }, raw : true })
  .then((avatar) =>{
    if(!avatar){
      console.log('NO AV ASSOCIATED WITH EMAIL');
      res.status(204).json({
        message: `No Avatar associated with user ${req.body.email}`
      });
      return;
    }else{
      const { getCurrentLevel, getNextLevel, } = xpCalc(avatar.activityXP, avatar.battleXP);
      const level = getCurrentLevel();
      const nextLevelStartXp = getNextLevel();
      const thisLevelStartXp = getNextLevel(-1);

      avatar.level = level;
      avatar.nextLevelStartXp = nextLevelStartXp;
      avatar.thisLevelStartXp = thisLevelStartXp;
      // Non-Whole numbers come out of DB as strings, so need to convert to numbers here
      avatar = parseAvatarProperties(avatar);
      avatar.restedEnough = avatar.maxHealth * .8 <= avatar.health;

      res.status(200).json({
        message: `Found matching Avatar`,
        avatar
      });
    }
      
    next();
  }).catch((err)=>{
    console.log(`Couldn't get Avatar for user ${req.body.email} DEBUG: ${err}`);
    res.status(400).json({
      message: `Couldn't get Avatar for user ${req.body.email}`,
      debug : err
    });
    next();
  });
});


router.post('/get-all-avatars', function(req, res, next){

  // next();
  Avatar.findAll({},{raw : true})
  .then((avatars) =>{
    avatars.forEach((avatar) =>{
      // Non-Whole numbers come out of DB as strings, so need to convert to numbers here
      avatar = parseAvatarProperties(avatar);

      const { currentLevelByInput } = xpCalc();
      avatar.level = currentLevelByInput(avatar.activityXP + avatar.battleXP);
      
    })
    
    // IN THE FUTURE, TRIM AVATAR FIELDS,  DONT NEED ALL OF THEM FOR RANKING PAGE
    res.status(200).json({
      message: `Retrieved All Avatars`,
      avatars
    });
    next();
  }).catch((err)=>{
    console.log(`Couldn't get all Avatars DEBUG: ${err}`);
    res.status(400).json({
      message: `Couldn't get All Avatars`,
      debug : err
    });
    next();
  });
});

module.exports = router;