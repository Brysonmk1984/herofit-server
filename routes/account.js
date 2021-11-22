const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateJWT } = require('../jwt/validateJWT');
const router = express.Router(); 
const { Avatar, User, Battle, AvatarItems } = require('../config/db');

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
router.delete('/:username', body('username').isString(), body('email').isEmail(), body('avatarID').isNumeric(), authenticateJWT, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for DELETE /:username");
  }

  // If deleting from the admin panel, use data from the body, otherwise from the passed in user token
  const { id, email } =  req.user;
  const { avatarID } = req.body;

  const promises = [];
  promises.push(AvatarItems.destroy({ where : { avatarID }}));
  promises.push(Battle.destroy({ where : { owner : email }}));

  Promise.allSettled(promises)
  .then(() =>{
    return Avatar.destroy({ where : { owner : email } });
  }).then(() =>{
    return User.destroy({ where : { id }});
  }).then(() =>{
    return res.formatter.ok({ message : 'Successfully deleted account!' });
  }).catch((error)=>{
    console.log(error);
    return res.formatter.serverError(error.toString(), `Unable to delete account for user ${email}, - DELETE /:username endpoint`);
  });

});

// DELETE ACCOUNT
router.delete('/:email', body('id').isNumeric().optional({nullable: true, checkFalsy: true}),  body('username').isString(), body('email').isEmail(), body('avatarID').isNumeric(), authenticateJWT, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for DELETE /:username");
  }

  // If deleting from the admin panel, use data from the body, otherwise from the passed in user token
  const { id, email } =  req.user;
  const { avatarID } = req.body;

  const promises = [];
  promises.push(AvatarItems.destroy({ where : { avatarID }}));
  promises.push(Battle.destroy({ where : { owner : email }}));

  Promise.allSettled(promises)
  .then(() =>{
    return Avatar.destroy({ where : { owner : email } });
  }).then(() =>{
    return User.destroy({ where : { id }});
  }).then(() =>{
    return res.formatter.ok({ message : 'Successfully deleted account!' });
  }).catch((error)=>{
    console.log(error);
    return res.formatter.serverError(error.toString(), `Unable to delete account for user ${email}, - DELETE /:username endpoint`);
  });

});


module.exports = router;