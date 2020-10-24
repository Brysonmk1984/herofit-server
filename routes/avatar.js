const express = require('express');
const router = express.Router(); 
const Avatar = require('../db').Avatar;
const AppMode = require('../appConfig').config.mode;
const { parseAvatarProperties } = require('../helperFunctions');

router.post('/insert-avatar', function(req, res, next){
  console.log('INSERTING AV', req.body.avatar);

  if(AppMode === 'beta'){
    req.body.avatar.pets.push({type : 'passive', name: 'Betta Fish', description: 'Reward for being a Beta Tester'})
  }

  Avatar.findOrCreate({
    where: {
      owner: req.body.owner
    },
    raw : true,
    // set the default properties if it doesn't exist
    defaults : Object.assign({},{ ...req.body.avatar }, { ownerUsername: req.body.ownerUsername, owner: req.body.email })
  }).then((avatar) =>{
    // Non-Whole numbers come out of DB as strings, so need to convert to numbers here
    avatar = parseAvatarProperties(avatar);

    // New Avatar Created
    if(avatar){
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

router.post('/update-avatar', function(req, res, next){
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

router.post('/get-avatar', function(req, res, next){
  Avatar.findOne({ where: { owner: req.body.email }, raw : true })
  .then((avatar) =>{

    // Non-Whole numbers come out of DB as strings, so need to convert to numbers here
    avatar = parseAvatarProperties(avatar);

    if(!avatar){
      res.status(204).json({
        message: `No Avatar associated with user ${req.body.email}`
      });
      return;
    }
    res.status(200).json({
      message: `Found matching Avatar`,
      avatar,
      cake : true
    });
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