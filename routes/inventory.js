const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router(); 
const Avatar = require('../db').Avatar;
const AvatarItems = require('../db').AvatarItems;
const Items = require('../db').Items;
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

  AvatarItems.findAll({
    attributes : ['id','avatarID','itemID','equipped'],
    where : { avatarID },
    include: [{
        model: Items,
        as : 'item',
        attributes: ['type','name','description','lore','effects','icon','class','exhaustible','ptCost'],
        // Required is false by default, adding a where clause makes it true by default. 
        // Still, false or true doesn't seem to have an impact here.
        //required: false,
      }],
      raw : undefined,
      nest : true,
    }).then((rows) =>{ 

    const inventory = rows.map((row)=>{
      return {
        id : row.id,
        avatarID : row.avatarID,
        itemID : row.itemID,
        equipped : row.equipped,
        ...row.item.dataValues
      }
    });

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
    console.log('ERR', error);
    res.formatter.serverError(error.toString(), `Error running /fetch-avatar-inventory`);
  });



});

router.post('/equip-item', body('avatarId'), body('equipId').isNumeric(), authenticateJWT, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for /equip-item");
  }
  const { avatarId, equipId } = req.body;

  AvatarItems.update({ equipped : true }, { where : { avatarID : avatarId, itemID : equipId }, returning : true, raw : true })
  .then((updatedItem) =>{
    //console.log('UI - ',updatedItem);
    res.formatter.ok({equippedItem : updatedItem[1][0]}, 'Successfully ran /equip-item');
  }).catch((error) =>{
    console.log('EQUIP ERROR - ', error);
    res.formatter.serverError(error.toString(), `Error running /equip-item`);
  });
});

router.post('/equip-unequip-item', body('avatarId'), body('equipId').isNumeric(), body('unequipId').isNumeric(), authenticateJWT, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for /equip-unequip-item");
  }
  const { avatarId, equipId, unequipId } = req.body;

  const equipPromises = [];
  //console.log('EID - ', equipId, 'UID - ', unequipId);
  equipPromises.push(AvatarItems.update({ equipped : false }, { where : { avatarID : avatarId, itemID : unequipId }, returning : true, raw : true }));
  equipPromises.push(AvatarItems.update({ equipped : true }, { where : { avatarID : avatarId, itemID : equipId }, returning : true, raw : true }));

  Promise.allSettled(equipPromises)
  .then((result) =>{
    const unequippedItem = result[0].value[1][0];
    const equippedItem = result[1].value[1][0];

    res.formatter.ok({ unequippedItem, equippedItem }, 'Successfully ran /equip-unequip-item');
  }).catch((error) =>{
    console.log('EQUIP,UNEQUIP ERROR - ', error);
    res.formatter.serverError(error.toString(), `Error running /equip-unequip-item`);
  });
});

router.post('/unequip-item', body('avatarId'), body('unequipId').isNumeric(), authenticateJWT, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for /unequip-item");
  }
  const { avatarId, unequipId } = req.body;

  AvatarItems.update({ equipped : false }, { where : { avatarID : avatarId, itemID : unequipId }, returning : true, raw : true })
  .then((updatedItem) =>{
    //console.log('UI - ',updatedItem);
    res.formatter.ok({ unequippedItem : updatedItem[1][0] }, 'Successfully ran /unequip-item');
  }).catch((error) =>{
    console.log('UNEQUIP ERROR - ', error);
    res.formatter.serverError(error.toString(), `Error running /unequip-item`);
  });
});

router.get('/get-default-items', (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for /get-default-items");
  }

  Items.findAll()
  .then((items) =>{
    res.formatter.ok({ items }, 'Successfully ran /get-default-items');
  }).catch((error)=>{
    console.log('THE ERR', error);
    res.formatter.serverError(error.toString(), `Error running GET /get-default-items`);
  });
});

// INSERT ITEM BY AVATAR ID - USER IN ADMIN PANEL
router.post('/insert-item-by-avatar-id', body('item').isObject(), authenticateJWT, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for /insert-item-by-avatar-id");
  }

  const { item } = req.body;
  console.log('the item - ', item);
  AvatarItems.create(
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
    return AvatarItems.bulkCreate(shard);
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
router.post('/buy-item-by-avatar-id', body('itemID').isNumeric(), body('ptCost').isNumeric(), body('avatarID').isNumeric(), authenticateJWT, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for POST /buy-item-by-avatar-id");
  }
  let { itemID, avatarID, ptCost } = req.body;
  const item = { itemID, avatarID, equipped : false };
  
  let remainingPT;
  Avatar.findOne({
    attributes : ['photonTokens'],
    where : { id : avatarID } 
  }).then(({ photonTokens })=>{
    if(photonTokens < ptCost){
      const error = new Error("Not Enough Photon Tokens");
      return res.formatter.badRequest(error.toString(), `Not Enough Photon Tokens POST /buy-item-by-avatar-id`);
    }

    return AvatarItems.create( item, { returning: true });
  }).then((result) =>{
    if(result.dataValues && result.dataValues.id){
      // If made it this far, then item was created... deduct PT
      return Avatar.update(
        { photonTokens : literal(`"photonTokens" - ${ptCost}`) },
        { where : { id : avatarID }, returning : true })
    }else{
      throw new Error('Item Could not be created');
    }
  }).then((result) =>{
    // PT was deducted from avatar, now fetch all Avatar inventory items

    remainingPT = result[1][0].photonTokens
    AvatarItems.findAll({
      attributes : ['id','avatarID','itemID','equipped'],
      where : { avatarID },
      include: [{
          model: Items,
          as : 'item',
          attributes: ['type','name','description','lore','effects','icon','class','exhaustible','ptCost'],
          // Required is false by default, adding a where clause makes it true by default. 
          // Still, false or true doesn't seem to have an impact here.
          //required: false,
        }],
        raw : undefined,
        nest : true,
      }).then((rows) =>{ 

        const inventory = rows.map((row)=>{
          const { id, avatarID, itemID, equipped, item } = row;
          return { id, avatarID, itemID, equipped, ...item.dataValues }
        });
  
        // Massage the data for the frontend
        const inventoryObj = { pets : [], skins : [], titles : [], consumables : [] };
        inventory.forEach((item) =>{
          if(inventoryObj[item.type +'s']){
            inventoryObj[item.type +'s'].push(item);
          }
        });
        inventoryObj.consumables = stackItems(inventoryObj.consumables);
        inventoryObj.remainingPT = remainingPT;
        res.formatter.ok(inventoryObj, 'Successfully ran POST /buy-item-by-avatar-id');
      }).catch((error) =>{
        res.formatter.serverError(error.toString(), 'Successfully ran POST /buy-item-by-avatar-id');
      });
  }).catch((error) =>{console.log('BUYITEMERROR-', error);
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
  console.log('EFFECTSS', effects);
  itemEffects(effects, avatarID, email)
  .then((data) =>{
    // If any effect errors out, throw new error
    data.forEach((result, i) =>{
      if(result instanceof Error){
        throw new Error(data.error);
      }
    });

    let avatar = parseAvatarProperties(data[0], true);

    AvatarItems.destroy({
      where : { id },
    }).then((data) =>{
      return AvatarItems.findAll({
        where : { avatarID },
        include: [{
          model: Items,
          as : 'item',
          where : { type : 'consumable' },
          attributes: ['type','name','description','lore','effects','icon','class','exhaustible','ptCost'],
          // Required is false by default, adding a where clause makes it true by default. 
          // Still, false or true doesn't seem to have an impact here.
          //required: false,
        }],
        raw : undefined,
        nest : true,
      });
      
    }).then((rows) =>{
      const consumables = rows.map((row)=>{
        return {
          id : row.id,
          avatarID : row.avatarID,
          itemID : row.itemID,
          equipped : row.equipped,
          ...row.item.dataValues
        }
      });
      const stackedItems = stackItems(consumables);
      res.formatter.ok({ consumables : stackedItems, avatar });
    }).catch((error) =>{
      console.log('USE ITEM INNER ERROR - ', error);
      res.formatter.serverError(error.toString(), `Error destroying item -  DELETE /use-consumable-item`);
    });
  }).catch((error) =>{
    console.log('USE ITEM OUTER ERROR - ', error);
    res.formatter.serverError(error.toString(), `Error doing applying item effects - DELETE /use-consumable-item`);
  });
});

module.exports = router;