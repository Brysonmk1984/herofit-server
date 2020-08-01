const express = require('express');
const router = express.Router(); 
const Avatar = require('../db').Avatar;


router.post('/insert-avatar', function(req, res, next){
  console.log('INSERTING AV', req.body.avatar);
  Avatar.findOrCreate({
    where: {
      owner: req.body.owner
    },
    // set the default properties if it doesn't exist
    defaults: { 
      owner: req.body.email,
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

    // New Avatar Created
    if(created){
      res.status(200).json({
        message: `New Avatar Saved belonging to owner ${avatar.owner}`,
        avatarId : avatar.id,
        avatar
      });
    // Updated Existing Avatar
    }else{
      res.status(200).json({
        message: `Existing Avatar updated belonging to owner ${avatar.owner}`,
        avatarId : avatar.id
      });
    }
    
    next();
  }).catch((err) =>{
    console.log(`Couldn't insert Avatar for user ${req.body.email}, ERROR MESSAGE: ${err}`);
    res.status(400).json({
      message: `Couldn't insert Avatar for user ${req.body.email}, ERROR MESSAGE: ${err}`,
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
    },
    { where: { owner: req.body.email } }
  )
  .then(function(result) {
    res.status(200).json({
      message: `${result[0]} record updated --- avatar ${req.body.id}`,
    });
  })
  .catch((err) =>{
    console.log(`Error updating avatar for user ${req.body.email}, ERROR MESSAGE: ${err}`);
    res.status(400).json({
      message: `Couldn't get Avatar for user ${req.body.email}, ERROR MESSAGE: ${err}`,
    });
    next();
  });
});

router.post('/get-avatar', function(req, res, next){
  // res.status(400).json({
  //   message: `Couldn't get Avatar for user , ERROR MESSAGE: `,
  // });
  //next();
  Avatar.findOne({ where: { owner: req.body.email } })
  .then((result) =>{
    const avatar = Object.assign({}, { 
      name: result.dataValues.name,
      character: result.dataValues.character,
      power: result.dataValues.power,
      health: result.dataValues.health,
      skills : JSON.parse(result.dataValues.skills),
      elements : JSON.parse(result.dataValues.elements),
      items : JSON.parse(result.dataValues.items)
    });
    res.status(200).json({

      message: `Found matching Avatar`,
      avatar
    });
    next();
  }).catch((err)=>{
    console.log(`Couldn't get Avatar for user ${req.body.email}, ERROR MESSAGE: ${err}`);
    res.status(400).json({
      message: `Couldn't get Avatar for user ${req.body.email}, ERROR MESSAGE: ${err}`,
    });
    next();
  });
});

module.exports = router;