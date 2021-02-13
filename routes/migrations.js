const express = require('express');
const router = express.Router(); 
const { Op } = require("sequelize");

const User = require('../db').User;
const UserActivity = require('../db').UserActivity;
const Avatar = require('../db').Avatar;
const AvatarEquip = require('../db').AvatarEquip;


router.post('/add-item' , function(req, res, next){
  console.log('req body - ', req.body);
  return AvatarEquip.create(
    { avatarID: req.body.avatarID, typeID : req.body.typeId, type : req.body.type, name : req.body.name, description : req.body.description, lore : req.body.lore, effect1 : req.body.effect1, effect2 : req.body.effect2, effect3 : req.body.effect3, equipped : false  },
    { returning : true, raw : true }
  ).then((item) =>{
    console.log('returned item', item);
    res.status(200).json({
      item
    });
  }).catch((error) =>{
    console.log('ERROR Creating Item', error);
    res.status(400).json({
      message : `ERROR creating Item - ${error}`,
    });
    next();
  });
});



module.exports = router;