const express = require('express');
const router = express.Router(); 
const Avatar = require('../db').Avatar;
const AppMode = require('../appConfig').config.mode;

router.post('/insert-avatar', function(req, res, next){
  console.log('INSERTING AV', req.body.avatar);

  if(AppMode === 'alpha'){console.log('HAS PET');
    req.body.avatar.pets.push({type : 'passive', name: 'Alpha Dog', description: 'Reward for being an Alpha Tester'})
  }

  Avatar.findOrCreate({
    where: {
      owner: req.body.owner
    },
    // set the default properties if it doesn't exist
    defaults: { 
      owner: req.body.email,
      ownerUsername: req.body.username,
      name: req.body.avatar.name,
      character: req.body.avatar.character,
      power: req.body.avatar.power,
      health: req.body.avatar.health,
      skills: JSON.stringify(req.body.avatar.skills),
      items: JSON.stringify(req.body.avatar.items),
      titles: JSON.stringify(req.body.avatar.titles),
      pets: JSON.stringify(req.body.avatar.pets),
      fire : req.body.avatar.fire,
      earth : req.body.avatar.earth,
      air : req.body.avatar.air,
      water : req.body.avatar.water
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

router.post('/update-avatar', function(req, res, next){
  Avatar.update(
    {
    power : req.body.avatar.power,
    health : req.body.avatar.health,
    skills: JSON.stringify(req.body.avatar.skills),
    items: JSON.stringify(req.body.avatar.items),
    titles: JSON.stringify(req.body.avatar.titles),
    pets: JSON.stringify(req.body.avatar.pets),
    fire : req.body.avatar.fire,
    earth : req.body.avatar.earth,
    air : req.body.avatar.air,
    water : req.body.avatar.water,
    hasBeenUpgraded : req.body.avatar.hasBeenUpgraded
    },
    { where: { owner: req.body.email } }
  )
  .then(function(result) {
    res.status(200).json({
      message: `${result[0]} record updated --- avatar ${req.body.id}`,
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
  Avatar.findOne({ where: { owner: req.body.email } })
  .then((result) =>{
    if(!result){
      console.log('NO RESULTS! Sending user a 204');
      res.status(204).json({
        message: `No Avatar associated with user ${req.body.email}`
      });
      return;
    }

    const avatar = Object.assign({}, { 
      name: result.dataValues.name,
      character: result.dataValues.character,
      power: result.dataValues.power,
      health: result.dataValues.health,
      fire : JSON.parse(result.dataValues.fire),
      earth : JSON.parse(result.dataValues.earth),
      air : JSON.parse(result.dataValues.air),
      water : JSON.parse(result.dataValues.water),
      skills : JSON.parse(result.dataValues.skills),
      items : JSON.parse(result.dataValues.items),
      titles : JSON.parse(result.dataValues.titles),
      pets : JSON.parse(result.dataValues.pets),
      hasBeenUpgraded : result.dataValues.hasBeenUpgraded,
      ownerUsername : result.dataValues.ownerUsername,
      updatedAt : result.dataValues.updatedAt,
      createdAt : result.dataValues.createdAt
    });console.log('AVATAR', avatar);
    res.status(200).json({
      message: `Found matching Avatar`,
      avatar
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
  Avatar.findAll()
  .then((results) =>{
      const avatars= results.map((result, i) =>{
        result.dataValues.items = JSON.parse(result.dataValues.items);
        result.dataValues.skills = JSON.parse(result.dataValues.skills);
        result.dataValues.titles = JSON.parse(result.dataValues.titles);
        result.dataValues.pets = JSON.parse(result.dataValues.pets);
        result.dataValues.fire = JSON.parse(result.dataValues.fire);
        result.dataValues.earth = JSON.parse(result.dataValues.earth);
        result.dataValues.air = JSON.parse(result.dataValues.air);
        result.dataValues.water = JSON.parse(result.dataValues.water);
        return result.dataValues;
      });

    res.status(200).json({
      message: `Found matching Avatar`,
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