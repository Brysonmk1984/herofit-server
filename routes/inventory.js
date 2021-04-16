const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router(); 
const Avatar = require('../db').Avatar;
const AvatarEquip = require('../db').AvatarEquip;
const ALLITEMS = require('../game/allItems.json');
const { col, literal } = require("sequelize");
const { stackItems, parseAvatarProperties, arrayChunker } = require('../helperFunctions');
const { itemEffects } = require('../game/applyEffects');
const { authenticateJWT } = require('../jwtValidation');

router.post('/fetch-avatar-inventory', body('avatarID').isNumeric(), authenticateJWT, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for /fetch-avatar-inventory");
  }
  const avatarID = req.body.avatarID;

  AvatarEquip.findAll(
    { where : { avatarID } }
  ).then((inventory) =>{ 
    // Massage the data for the frontend
    const inventoryObj = {
      pets : [],
      skins : [],
      titles : [],
      consumables : []
    };
    inventory.forEach((thing) =>{
      if(inventoryObj[thing.type +'s']){
        inventoryObj[thing.type +'s'].push(thing);
      }
    });
    inventoryObj.consumables = stackItems(inventoryObj.consumables);
 
    res.formatter.ok(inventoryObj, 'Successfully ran /fetch-avatar-inventory');
  }).catch((error) =>{
    res.formatter.serverError(error.toString(), `Error running /fetch-avatar-inventory`);
  });

});

router.post('/equip-item', body('equipId').isNumeric(), authenticateJWT, (req, res) => {
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

router.post('/equip-unequip-item', body('equipId').isNumeric(), body('unequipId').isNumeric(), authenticateJWT, (req, res) => {
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

router.post('/unequip-item', body('unequipId').isNumeric(), authenticateJWT, (req, res) => {
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

// INSERT ITEM BY AVATAR ID - USER IN ADMIN PANEL
router.post('/insert-item-by-avatar-id', body('item').isObject(), authenticateJWT, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for /insert-item-by-avatar-id");
  }

  const { item } = req.body;
  console.log('the item - ', item);
  AvatarEquip.create(
    item, { returning: true }
  ).then((data) =>{
    res.formatter.ok({ createdItem : data }, 'Successfully ran /insert-item-by-avatar-id');
  }).catch((error) =>{
    res.formatter.serverError(error.toString(), `Error running /insert-item-by-avatar-id`);
  });
});

// INSERT ITEM FOR ALL AVATARS - USER IN ADMIN PANEL
router.post('/insert-item-for-all-avatars', body('item').isObject(), authenticateJWT, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for  POST /insert-item-for-all-avatars");
  }
  const { item } = req.body;
  console.log('item!',item);
  function insertItemsForBatch(shard){
    console.log('SHARD', shard);
    return AvatarEquip.bulkCreate(shard);
  }
  
  return Avatar.findAll({
    attributes : ['id']
  }).then((results) =>{

    const allItemsWithAvIds = results.map((obj) =>{
      const itemWithAvId = Object.assign({}, item, { avatarID : obj.id })
      return itemWithAvId;
    });

    itemShards = arrayChunker(allItemsWithAvIds, 50);

    return Promise.allSettled(itemShards.map(async (shard, i) => {

      // Update one batch every 2 seconds
      const timeoutDuration = i * 2000;
      // RUN BATTLES ON BATCH
      return await new Promise((resolve) =>{
        setTimeout(() => {
          resolve(insertItemsForBatch(shard));
        }, timeoutDuration);
      });
    })).then(() =>{
      console.log('HERE');
      res.formatter.ok('worked');
    }).catch((error) =>{
      console.log('ERROR', error);
      res.formatter.serverError(error.toString(), 'Inner Error');
    });

  }).catch((error) =>{
    console.log('OUTER ERROR', error);
    res.formatter.serverError(error.toString(), 'Outer Error');
  });


});


// BUY ITEM BY AVATAR ID
router.post('/buy-item-by-avatar-id', body('itemName').isString(), body('itemType').isString(), body('avatarID').isNumeric(), authenticateJWT, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for POST /buy-item-by-avatar-id");
  }
  let { itemName, itemType, avatarID } = req.body;
  const item = Object.assign({}, ALLITEMS[`${itemType}s`].find(item => item.name === itemName), { avatarID });
  delete item.id;

  let remainingPT;
  Avatar.findOne({
    attributes : ['photonTokens'],
    where : { id : avatarID } 
  }).then(({ photonTokens })=>{
    if(photonTokens < item.ptCost){
      const error = new Error("Not Enough Photon Tokens");
      return res.formatter.badRequest(error.toString(), `Not Enough Photon Tokens POST /buy-item-by-avatar-id`);
    }
    return Avatar.update(
      { photonTokens : literal(`"photonTokens" - ${item.ptCost}`) },
      { where : { id : avatarID }, returning : true })
  }).then((result) =>{
    remainingPT = result[1][0].photonTokens
    //console.log('PTTT - ', result[1], remainingPT);
    return AvatarEquip.create( item, { returning: true });
  }).then((result) =>{
    return AvatarEquip.findAll({
      where : { avatarID, type : 'consumable' }
    })
  }).then((consumables) =>{
    const stackedItems = stackItems(consumables);
    res.formatter.ok({ consumables : stackedItems, remainingPT }, 'Successfully ran POST /buy-item-by-avatar-id');
  }).catch((error) =>{console.log('error', error);
    res.formatter.serverError(error.toString(), `Error running POST /buy-item-by-avatar-id`);
  });
});


// CONSUME ITEM - first applies effects of the item, then deletes it from the Hero's inventory
router.delete('/use-consumable-item', body('id').isNumeric(), body('email').isEmail(), body('avatarID').isNumeric(), body('effects').isArray(), authenticateJWT, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for DELETE /use-consumable-item");
  }

  const { id, email, avatarID, effects } = req.body;

  itemEffects(effects, avatarID, email)
  .then((data) =>{
    console.log('DDATA', data);
    // If any effect errors out, throw new error
    data.forEach((result, i) =>{
      console.log(`result! ${i}`, result instanceof Error);
      if(result instanceof Error){
        throw new Error(data.error);
      }
    });
    console.log('DONE - ', data[0]);
    let avatar = parseAvatarProperties(data[0], true);
    console.log('DONE2 - ', avatar);
    AvatarEquip.destroy({
      where : { id }
    }).then((data) =>{
      return AvatarEquip.findAll({
        where : { avatarID, type : 'consumable' }
      });
    }).then((consumables) =>{
      const stackedItems = stackItems(consumables);
      res.formatter.ok({ consumables : stackedItems, avatar });
    }).catch((error) =>{
      res.formatter.serverError(error.toString(), `Error destroying item -  DELETE /use-consumable-item`);
    });
  }).catch((error) =>{
    res.formatter.serverError(error.toString(), `Error doing applying item effects - DELETE /use-consumable-item`);
  });
});

module.exports = router;