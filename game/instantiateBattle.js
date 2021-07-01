const db = require('../config/db').db;
const { Op } = require("sequelize");
const { Items } = require('../config/db');
const xpCalc = require('./upgrades/xpCalc');
const insertBattle = require('./insertBattle');
const { findFoeTemplateByType, selectFoeTemplate, determineFoeWithStats } = require('./foeFunctions');
const { parseAvatarProperties } = require('../lib/helperFunctions');

// Used to insert a battle into the DB for both random midnight battles or item-instantiated battles
// FoeType is null unless an item created the battle
function instantiateBattle(avatarID, foeType = null){

  const q = `
  SELECT id, avatars.name, avatars.character, avatars.qp, avatars.health, avatars."maxHealth", avatars.power, avatars.armor, avatars.fire, avatars.air, avatars.water, avatars.earth, avatars.aether, avatars.status, avatars."statusFade", avatars."activityXP", avatars."battleXP", avatars."battleWins", avatars."battleLosses", avatars."battleDraws", avatars."battleDkos", avatars."photonTokens", avatars.owner, equipped 
  FROM avatars
  LEFT OUTER JOIN (SELECT "avatarID", array_agg(json_build_object('equipped', equipped, 'itemID', "itemID")) AS equipped
    FROM avatar_items WHERE avatar_items.equipped=true group by 1) AS equipped ON(id="avatarID")
  WHERE avatars.id = $1
`;

  // GET AVATAR
  return db.query(q, { bind : [avatarID], plain: true })
  .then((results) =>{
    if(results.goToBattle){
      throw new Error('Hero is already queued for another battle, please try again later.')
    }
    // Preparing avatar
    const avatar = parseAvatarProperties(results);
    avatar.health = avatar.maxHealth;
    const equippedItemIds = avatar.equipped ? avatar.equipped.map(item => item.itemID) : [];
    const { getCurrentLevel } = xpCalc(avatar.activityXP, avatar.battleXP);
    const { total } = getCurrentLevel();  
    // Getting Foe Template
    const foe = foeType ? findFoeTemplateByType(foeType) : selectFoeTemplate(total);
    // Adding stats to Foe
    const foeWithStats = determineFoeWithStats(avatar, foe);

    
    // Get corresponding items for avatar
    return Items.findAll({
      where : { id : { [Op.in] : equippedItemIds } }, attributes : ['id', 'type', 'name', 'effects', 'action']
    }).then((items) =>{
      avatar.equipped = items;
      // Insert Battle into DB
      return insertBattle(avatar, foeWithStats);
    }).then((result) =>{
      if(result.error){
        throw new Error('Failed to Insert Battle')
      }
      return result;
    }).catch((error) =>{
      console.log('Error with items before instantiating battle', error);
      return { error };
    });

  }).catch((error) =>{
    console.log('Error Instantiating Battle', error);
    return { error };
  });
}

module.exports = instantiateBattle;