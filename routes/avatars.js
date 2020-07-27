const express = require('express');
const router = express.Router(); 
const Avatar = require('../db').Avatar;


router.post('/insert-avatar', function(req, res, next){
  Avatar.findOrCreate({
    where: {
      owner: req.body.owner
    },
    // set the default properties if it doesn't exist
    defaults: { 
      email: req.body.email,
      name: req.body.name,
      character: req.body.character,
      power: req.body.power,
      health: req.body.health,
      skills: JSON.stringify(req.body.skills),
      elements: JSON.stringify(req.body.elements),
      items: JSON.stringify(req.body.items),
    }
  }).then((result) =>{
    const created = result[1];
    const avatar = result[0].dataValues;
    let response = {};
    
    // New Avatar Created
    if(created){
      response = {
        success: true,
        message: `New Avatar Saved belonging to owner ${avatar.owner}`
      };
      res.status(200).send({
        success: true,
        message: `Found matching Avatar`,
        avatarId : avatar.avatarId
      });
    // Updated Existing Avatar
    }else{
      response = {
        success: true,
        message: `Existing Avatar updated belonging to owner ${avatar.owner}`
      };
      res.status(200).send({
        success: true,
        message: `Found matching Avatar`,
        avatarId : avatar.avatarId
      });
    }
    
    next();
  }).catch((err) =>{
    console.log('ERRRRROR', err);
    next();
  });
});

router.post('/get-avatar', function(req, res, next){
  Avatar.findOne({ where: { owner: req.body.owner } })
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
    res.status(200).send({
      success: true,
      message: `Found matching Avatar`,
      avatar
    });
    next();
  }).catch((err)=>{
    console.log('ERRRRROR', err);
    next();
  });
});

module.exports = router;