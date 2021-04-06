const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router(); 
const AvatarEquip = require('../db').AvatarEquip;
const ALLITEMS = require('../game/allItems.json');
const { authenticateJWT } = require('../jwtValidation');

router.post('/fetch-avatar-inventory', authenticateJWT, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for /fetch-avatar-inventory");
  }
  const avatarID = req.body.avatarID;
  //console.log('FETCHING AVATAR INV FOR -', avatarID);
  AvatarEquip.findAll(
    { where : { avatarID } }
  ).then((inventory) =>{ 
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
    res.formatter.ok(inventoryObj, 'Successfully ran /fetch-avatar-inventory');
  }).catch((error) =>{
    res.formatter.serverError(error.toString(), `Error running /fetch-avatar-inventory`);
  });

});

router.post('/equip-item', authenticateJWT, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for /equip-item");
  }
  const equipId = req.body.equipId;
  //console.log('EQUIP', equipId);
  AvatarEquip.update({ equipped : true }, { where : { id : equipId }, returning : true, raw : true })
  .then((updatedItem) =>{
    //console.log('UI - ',updatedItem);
    res.formatter.ok({equippedItem : updatedItem[1][0]}, 'Successfully ran /equip-item');
  }).catch((error) =>{
    res.formatter.serverError(error.toString(), `Error running /equip-item`);
  });
});

router.post('/equip-unequip-item', authenticateJWT, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for /equip-unequip-item");
  }
  const equipId = req.body.equipId;
  const unequipId = req.body.unequipId;

  const equipPromises = [];

  equipPromises.push(AvatarEquip.update({ equipped : false }, { where : { id : unequipId }, returning : true, raw : true }));
  equipPromises.push(AvatarEquip.update({ equipped : true }, { where : { id : equipId }, returning : true, raw : true }));

  Promise.allSettled(equipPromises)
  .then((result) =>{
    const unequippedItem = result[0].value[1][0];
    const equippedItem = result[1].value[1][0];

    res.formatter.ok({ unequippedItem, equippedItem }, 'Successfully ran /equip-unequip-item');
  }).catch((error) =>{
    res.formatter.serverError(error.toString(), `Error running /equip-unequip-item`);
  });
});

router.post('/unequip-item', authenticateJWT, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for /unequip-item");
  }
  const unequipId = req.body.unequipId;
  //console.log('UNEQUIP', unequipId);
  AvatarEquip.update({ equipped : false }, { where : { id : unequipId }, returning : true, raw : true })
  .then((updatedItem) =>{
    //console.log('UI - ',updatedItem);
    res.formatter.ok({ unequippedItem : updatedItem[1][0] }, 'Successfully ran /unequip-item');
  }).catch((error) =>{
    res.formatter.serverError(error.toString(), `Error running /unequip-item`);
  });
});

router.get('/get-default-items', (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for /get-default-items");
  }
  res.formatter.ok({ items : ALLITEMS }, 'Successfully ran /get-default-items');
});

// For Item Modal, Battle reports only display PBA reward, need to use that to fetch actual item here
router.post('/fetch-owned-item-by-name', body('name').isString(), body('avatarID').isNumeric, (req, res) => {
  console.log('REQ BODY', req.body);
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for /get-default-items");
  }
  const { name, avatarID } = req.body;
  console.log('here',name, avatarID);
  AvatarEquip.findOne({ 
    where : { avatarID, name }, raw : true
  }).then((item) =>{ 
    console.log('ITTTEM', item);
    res.formatter.ok({ item : item }, 'Successfully ran /fetch-owned-item-by-name');
  }).catch((error) =>{console.log('ERR', error);
    res.formatter.serverError(error.toString(), 'Error Running  /get-default-items Endpoint');
  });
});

router.post('/insert-item-by-avatar-id', authenticateJWT, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for /insert-item-by-avatar-id");
  }

  const item = req.body;

  AvatarEquip.create(
    item, { returning: true }
  ).then((data) =>{
    res.formatter.ok({ createdItem : data }, 'Successfully ran /insert-item-by-avatar-id');
  }).catch((error) =>{
    res.formatter.serverError(error.toString(), `Error running /insert-item-by-avatar-id`);
  });
});

module.exports = router;