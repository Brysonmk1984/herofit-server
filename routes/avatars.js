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
      skills: req.body.skills,
      elements: req.body.elements,
      items: req.body.items,
    }
  }).then((result) =>{
    const created = result[1];
    const avatar = result[0].dataValues;
    let response = {};
    
    // New Avatar Created
    if(created){
      response = {
        success: true,
        message: `New Avatar Saved belonging to owner ${avatar.owner}`,
        avatar : avatar
      };
    // Updated Existing Avatar
    }else{
      response = {
        success: true,
        message: `Existing Avatar updated belonging to owner ${avatar.owner}`,
        avatar : avatar
      };
    }
    res.status(200).send(response);
    next();
  }).catch((err) =>{
    console.log('ERRRRROR', err);
    next();
  });
});

router.post('/get-avatar', function(req, res, next){
  Avatar.findOne({ where: { owner: req.body.owner } })
  .then((result) =>{
    console.log('AVATAR result', result.dataValues);
    res.status(200).send({
      success: true,
      message: `Found matching Avatar`,
      avatar : result.dataValues
    });
    next();
  }).catch((err)=>{
    console.log('ERRRRROR', err);
    next();
  });
});

module.exports = router;