const express = require('express');
const router = express.Router(); 
const db = require('../db').db;
const AvatarEquip = require('../db').AvatarEquip;

router.post('/fetch-avatar-inventory', function(req, res, next){
  const avatarID = req.body.avatarID;
  console.log('HERE-', avatarID);
  AvatarEquip.findAll(
    { where : { avatarID } }

  ).then((inventory) =>{
    console.log('INV - ', inventory);
    
    // Massage the data for the frontend
    const inventoryObj = {
      pets : [],
      skins : [],
      titles : [],
      items : []
    };
    inventory.forEach((thing) =>{
      inventoryObj[thing.type +'s'].push(thing);
    });

    res.status(200).json(inventoryObj);
  }).catch((err) =>{
    res.status(400).json({
      message: `Error retrieving  ${req.body.email}`,
      debug : err
    });
    next();
  });

});

module.exports = router;