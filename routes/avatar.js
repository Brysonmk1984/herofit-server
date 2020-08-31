const express = require('express');
const router = express.Router(); 
const Avatar = require('../db').Avatar;
const AppMode = require('../appConfig').config.mode;

router.post('/insert-avatar', function(req, res, next){
  console.log('INSERTING AV', req.body.avatar);

  if(AppMode === 'Alpha'){console.log('HAS PET');
    req.body.avatar.items.push({type : 'pet', name: 'Alpha Dog', description: 'Reward for being an Alpha Tester'})
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
      elements: JSON.stringify(req.body.avatar.elements),
      items: JSON.stringify(req.body.avatar.items),
    }
  }).then((result) =>{
    const created = result[1];
    const avatar = result[0].dataValues;
    avatar.items = JSON.parse(avatar.items);
    avatar.elements = JSON.parse(avatar.elements);
    avatar.skills = JSON.parse(avatar.skills);
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
    elements: JSON.stringify(req.body.avatar.elements),
    items: JSON.stringify(req.body.avatar.items),
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
  // res.status(400).json({
  //   message: `Couldn't get Avatar for user , ERROR MESSAGE: `,
  //   debug: 'CAKE'
  // });
  // next();
  Avatar.findOne({ where: { owner: req.body.email } })
  .then((result) =>{
    if(!result){
      console.log('NO RESULTS! Sending user a 204');
      res.status(204).json({
        message: `No Avatar associated with user ${req.body.email}`
      });
      return;
    }
    let elements = JSON.parse(result.dataValues.elements);
    elements.air = parseFloat(elements.air);
    elements.earth = parseFloat(elements.earth);
    elements.fire = parseFloat(elements.fire);
    elements.water = parseFloat(elements.water);

    const avatar = Object.assign({}, { 
      name: result.dataValues.name,
      character: result.dataValues.character,
      power: result.dataValues.power,
      health: result.dataValues.health,
      skills : JSON.parse(result.dataValues.skills),
      elements,
      items : JSON.parse(result.dataValues.items),
      hasBeenUpgraded : result.dataValues.hasBeenUpgraded,
      ownerUsername : result.dataValues.ownerUsername,
      updatedAt : result.dataValues.updatedAt,
      createdAt : result.dataValues.createdAt
    });
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
        result.dataValues.elements = JSON.parse(result.dataValues.elements);
        result.dataValues.items = JSON.parse(result.dataValues.items);
        result.dataValues.skills = JSON.parse(result.dataValues.skills);
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