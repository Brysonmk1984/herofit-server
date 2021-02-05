const express = require('express');
const router = express.Router(); 
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

router.post('/equip-item', function(req, res, next){
  const equipId = req.body.equipId;
  const unequipId = req.body.unequipId;

  const equipPromises = [];

  equipPromises.push(AvatarEquip.update({ equipped : false }, { where : { id : unequipId }, returning : true }));
  equipPromises.push(AvatarEquip.update({ equipped : true }, { where : { id : equipId }, returning : true }));

  Promise.allSettled(equipPromises)
  .then((result) =>{
    const updatedItems = result.map((item) => item.value[1]);

    res.status(200).json({
      updatedItems
    })
  }).catch((error) =>{
    
    res.status(400).json({
      message: `Couldn't update item equip status`,
      debug : error
    });
    next();
  })
  

});

router.post('/unequip-item', function(req, res, next){
  const unequipId = req.body.unequipId;
  console.log('!!!', unequipId);
  AvatarEquip.update({ equipped : false }, { where : { id : unequipId }, returning : true, raw : true })
  .then((updatedItem) =>{
    console.log('UI - ',updatedItem);

    res.status(200).json({
      updatedItems : updatedItems[1]
    })
  }).catch((error) =>{
    
    res.status(400).json({
      message: `Couldn't update item equip status`,
      debug : error
    });
    next();
  })
});



module.exports = router;