const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateJWT } = require('../jwtValidation');
const router = express.Router(); 
const { Avatar, User, Battle, AvatarItems } = require('./config/db');

// UPDATE HERO NAME
router.post('/update-avatar-name', body('owner').isEmail(), body('newHeroName').isString({ min: 3, max: 25 }), authenticateJWT, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for /update-avatar-name endpoint");
  }

  Avatar.update(
    { name : req.body.newHeroName },
    { where : { owner : req.body.owner}, returning : true },
  ).then((result) =>{
    if(result[0]){
      return res.formatter.ok({ updatedName : result[1][0].name });
    }else{
      throw new Error('No Avatar Result');
    }
  }).catch((error) =>{
    console.log('Error updating name - ', error);
    res.formatter.serverError(error.toString(), 'Unable to update avatar name - for /update-avatar-name endpoint');
  });

});

// UPDATE USERNAME
router.post('/update-owner-username', body('owner').isEmail(), body('newUsername').isString({ min: 3, max: 25 }), authenticateJWT, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for /update-owner-username endpoint");
  }

  User.update(
    { username : req.body.newUsername },
    { where : { email : req.body.owner}, returning : true },
  ).then((result) =>{
    if(result[0]){
      return res.formatter.ok({ updatedUsername: result[1][0].username });
    }else{
      throw new Error('Unable to update Record');
    }
  }).catch((error) =>{
    console.log('Error updating name - ', error);
    res.formatter.serverError(error.toString(), 'Unable to update username - for /update-owner-username endpoint');
  });
});

// DELETE ACCOUNT
router.delete('/:username', body('email').isEmail(), body('id').isNumeric(), body('avatarId').isNumeric(), authenticateJWT, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for DELETE /:username");
  }
  const { avatarId, email, id } = req.body;

  const promises = [];
  promises.push(AvatarItems.destroy({ where : {avatarID : avatarId }}));
  promises.push(Battle.destroy({ where : { owner : email }}));
  
  Promise.allSettled(promises)
  .then(() =>{
    console.log('Deleted battles and Items, now deleting avatar');
    return Avatar.destroy({ where : { owner : req.body.email } });
  }).then(() =>{
    console.log('Deleted Avatar, now deleting User');
    return User.destroy({ where : { id }});
  }).then(() =>{
    return res.formatter.ok({ message : 'Successfully deleted account!' });
  }).catch((error)=>{
    console.log(error);
    return res.formatter.serverError(error.toString(), `Unable to delete account for user ${email}, - DELETE /:username endpoint`);
  });

});

module.exports = router;