const express = require('express');
const router = express.Router(); 
const Avatar = require('../db').Avatar;
const User = require('../db').User;

// UPDATE HERO NAME
router.post('/update-avatar-name', function(req, res, next){
  console.log('NN - ', req.body.owner, req.body.newHeroName);
  Avatar.update(
    { name : req.body.newHeroName },
    { where : { owner : req.body.owner}, returning : true },
  ).then((result) =>{
    if(result[0]){
      res.status(200).json({
        updatedName : result[1][0].name
      });
      next();
    }else{
      throw new Error('Unable to update Record');
    }
  }).catch((error) =>{
    console.log('Error updating name - ', error);
    res.status(400).json({
     error,
     message : 'Unable to update record'
    });
    next();
  });

});

// UPDATE USERNAME
router.post('/update-owner-username', function(req, res, next){
  console.log('NN - ', req.body.owner, req.body.newUsername);
  Avatar.update(
    { ownerUsername : req.body.newUsername },
    { where : { owner : req.body.owner}, returning : true },
  ).then((result) =>{
    if(result[0]){
      res.status(200).json({
        updatedUsername: result[1][0].ownerUsername
      });
      next();
    }else{
      throw new Error('Unable to update Record');
    }
  }).catch((error) =>{
    console.log('Error updating name - ', error);
    res.status(400).json({
     error,
     message : 'Unable to update record'
    });
    next();
  });

});

// DELETE ACCOUNT
router.delete('/:username', function(req, res, next){

});

module.exports = router;