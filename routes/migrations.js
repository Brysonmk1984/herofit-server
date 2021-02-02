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
    { avatarID: req.body.avatarID, typeID : req.body.typeId, type : req.body.type, name : req.body.name, description : req.body.description, lore : req.body.lore, effect1 : req.body.effect1, effect2 : req.body.effect2, effect3 : req.body.effect3  },
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

// Will get any avatar that has a title in their JSONB array, and make a new item in the avatar_equip table
// Currently set up for titles; needs to be modified for the other item types.
router.get('/move-titles' , function(req, res, next){
  return Avatar.findAll(
  { attributes : [ 'id', 'titles' ], where : {
    "titles": {
      [Op.ne]: []
    }
  } },
  { raw : true }
  ).then((avatars) => {
    
    
    //console.log('AVA - ', avatars);
    const allItemPromises = [];

    avatars.forEach((av) =>{
      const title = av.titles[0];
      console.log(av.id, title);

      let typeID;
      if(title.title === 'White Light Warrior'){
        typeID = 100;
      }


      allItemPromises.push(AvatarEquip.create(
        { avatarID: av.id, typeID : typeID, type : 'title', name : title.title, description : title.description, lore : req.body.lore, effect1 : req.body.effect1, effect2 : req.body.effect2, effect3 : req.body.effect3  },
        { returning : true, raw : true }
      ));

    });

    Promise.allSettled(allItemPromises)
    .then((data) =>{
      console.log('DATA - ', data);
      res.status(200).json({
        data
      });
    });

  })

});



// Will get any avatar that has a pet in their JSONB array, and make a new item in the avatar_equip table
router.get('/move-pets' , function(req, res, next){
  return Avatar.findAll(
  { attributes : [ 'id', 'pets' ], where : {
    "pets": {
      [Op.ne]: []
    }
  } },
  { raw : true }
  ).then((avatars) => {
    
    //console.log('AVA - ', avatars);
    const allItemPromises = [];

    avatars.forEach((av) =>{
      const pet = av.pets[0];
      console.log(av.id, pet);

      let typeID;
      if(pet.name === 'Betta Fish'){
        typeID = 1;
      }else if(pet.name === 'Alpha Dog'){
        typeID = 0;
      }

      allItemPromises.push(AvatarEquip.create(
        { avatarID: av.id, typeID : typeID, type : 'pet', name : pet.name, description : pet.description, lore : req.body.lore, effect1 : req.body.effect1, effect2 : req.body.effect2, effect3 : req.body.effect3  },
        { returning : true, raw : true }
      ));

    });

    Promise.allSettled(allItemPromises)
    .then((data) =>{
      console.log('DATA - ', data);
      res.status(200).json({
        data
      });
    });

  })

});



module.exports = router;