const express = require('express');
const router = express.Router(); 
const { body, validationResult } = require('express-validator');
const { authenticateJWT } = require('../jwt/validateJWT');
const db = require('../config/db').db;
const { Avatar, AvatarItems, User, UserTotal, Items } = require('../config/db');
const { AVATAR_COUNT_PER_PAGE } = require('../appConfig').config;
const { literal, Op } = require("sequelize");
const { parseAvatarProperties, paginate } = require('../lib/helperFunctions');
const { COMPETITIVE_ACTIVITIES, NONCOMPETITIVE_ACTIVITIES, MAX_LEVEL } = require('../game/CONSTANTS');
const avCalc = require('../game/upgrades/avCalc');
const xpCalc = require('../game/upgrades/xpCalc');
const  { activityItemFind } = require('../game/activityItemFind');
const RANKING_FILTER_ACTIVITIES = ['ride', 'weightTraining', 'hike', 'yoga', 'walk', 'rowing', 'stairStepper', 'elliptical', 'swim', 'crossfit', 'run', 'kayaking'];

// Create Avatar in DB after Signup
router.post('/insert-avatar', body('avatar').isObject(), body('userId').isNumeric(), body('email').isEmail(), authenticateJWT, (req, res) => {
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    return res.formatter.badRequest(errors.array(), "Validation Error - for POST /insert-avatar Endpoint");
  }
  let { avatar, userId, email } = req.body;
  // This is to allow the user to Go To Battle after signup.
  if(avatar.status === 'New Recruit'){
    avatar.status = 'Rested';
  }
  console.log('FINDORCREATE-', email, userId, avatar );
  Avatar.findOrCreate({
    where: { owner : email },
    // set the default properties if it doesn't exist
    defaults : Object.assign({},{ ...avatar }, { userId, owner: email})
  }).then((result) =>{
    const created = result[1];
    // Avatar from results, parse properties that are strings that need to be numbers
    avatar = parseAvatarProperties(result[0].dataValues);
    avatar.restedEnough = avatar.maxHealth * .8 <= avatar.health;
    avatar.equipped = [];

    res.formatter.ok({
      avatarId : avatar.id,
      avatar,
      hasAvatar : true
    });
  }).catch((error) =>{
    console.log(`Couldn't insert Avatar for user ${email}, DEBUG: ${error}`);
    res.formatter.serverError(error.toString(), `Couldn't insert Avatar for user ${email} for POST /insert-avatar Endpoint`);
  });
});

// Update Avatar without full buff sequence. Used when spending QP points and initial avatar update after Strava connection
router.post('/update-avatar', body('avatar').isObject(), body('email').isEmail(), authenticateJWT, (req, res) => {

  const errors = validationResult(req);
  if(!errors.isEmpty()){
    return res.formatter.badRequest(errors.array(), "Validation Error - for POST /update-avatar endpoint");
  }
  
  const { avatar, email } = req.body;
  delete avatar.restedEnough;

  Avatar.update(
    {...avatar},
    { where: { owner: email }, raw : true }
  ).then((result) => {
    res.formatter.ok();
  }).catch((error) =>{
    console.log(`Error updating avatar for user ${email}, DEBUG: ${error}`);
    res.formatter.serverError(error.toString(), `Couldn't get Avatar for user ${email} for POST /update-avatar Endpoint`);
  });
});

// When a user applies their latest Strava activities, adjust avatar
router.post('/buff-and-update-avatar', body('email').isEmail(), authenticateJWT, (req, res) => {
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    return res.formatter.badRequest(errors.array(), "Validation Error - for POST /buff-and-update-avatar Endpoint");
  }
  const { email } = req.body;
  delete req.body.restedEnough;
  let ut, avStatSnapshot, aXPDiff, lvlUp, lvlAfterBuff, qpe;
  let foundItems;
  let returnPackage;

  return db.transaction(t => {
    let improvements;
      // First, retrieve userTotals AND avatar from DB
    return UserTotal.findOne(
      { where: { user: email }, attributes: [...COMPETITIVE_ACTIVITIES, ...NONCOMPETITIVE_ACTIVITIES], raw : true, transaction: t }
    ).then((userTotals) =>{
      ut = userTotals;

      // Get Avatar to buff as well as all possible items that can drop from activities
      return Promise.all([
        Avatar.findOne({ 
          where: { owner: email }, attributes : ['character', 'createdAt','activityXP', 'battleXP', 'power', 'health', 'maxHealth', 'fire', 'earth', 'water', 'air', 'aether', 'qpFire', 'qpEarth', 'qpWater', 'qpAir', 'qpPower', 'qpHealth', 'qpAether', 'qp', 'photonTokens', 'status'], raw : true, transaction: t, 
        }), 
        Items.findAll({ 
          where: { dropRate: { [Op.ne]: null }, disabled : false }, attributes : ['name', 'dropRate', 'levelRestriction', 'activityRestriction', 'disabled'], raw : true, transaction: t, 
        })])
    }).then((result) =>{console.log('RESSS', result);
      const avatar = result[0];
      const possibleItemDrops = result[1];
      avStatSnapshot = Object.assign({}, { activityXP : avatar.activityXP, power : avatar.power, maxHealth : avatar.maxHealth, fire : avatar.fire, earth : avatar.earth, water : avatar.water, air : avatar.air, aether : avatar.aether });
      
      const { checkLevelUp, calcNewActivityXPFromUt } = xpCalc(avatar.activityXP, avatar.battleXP);
      const { updatePower, updateHealth, updateAether, updateElements, updateStatus } = avCalc(ut);  
      console.log('snap', avStatSnapshot);
      // Updated aXP
      const aXP = calcNewActivityXPFromUt(ut);
      aXPDiff = aXP - avStatSnapshot.activityXP;
      console.log('AXP DIFF', aXPDiff);
      const { leveledUp, endingLevel, qpEarned } = checkLevelUp(aXPDiff);
      console.log(leveledUp, endingLevel, qpEarned);
      lvlUp = leveledUp;
      // endingLevel starts over after MAX_LEVEL(100)
      lvlAfterBuff = endingLevel > MAX_LEVEL ? (endingLevel - MAX_LEVEL) : endingLevel;
      qpe = qpEarned;

      const updatedPower = updatePower(endingLevel, avatar.qpPower);
      const updatedAether = updateAether(endingLevel, avatar.qpAether);
      const { updatedHealth, updatedMaxHealth } = updateHealth(endingLevel, avatar.qpHealth, avatar.health, avatar.maxHealth, avatar.status, lvlUp);
      const updatedStatus = updateStatus(avatar.status, lvlUp);
      const { fire, earth, water, air } = updateElements(avatar.character, { qpFire : avatar.qpFire, qpEarth : avatar.qpEarth, qpWater : avatar.qpWater, qpAir : avatar.qpAir }, avatar.createdAt);

      console.log('!!!', updatedAether, avStatSnapshot.aether);

      // Calc gains here to be displayed on frontend
      improvements = {
        power : updatedPower - avStatSnapshot.power,
        health : avatar.maxHealth - avStatSnapshot.maxHealth,
        air : Number((air - avStatSnapshot.air).toFixed(2)),
        water : Number((water - avStatSnapshot.water).toFixed(2)),
        fire : Number((fire - avStatSnapshot.fire).toFixed(2)),
        earth : Number((earth - avStatSnapshot.earth).toFixed(2)),
        aether : Number((updatedAether - avStatSnapshot.aether).toFixed(2)),
      };

      // Needed for activity-specific items
      const totalElmImprove = improvements.air + improvements.water + improvements.fire + improvements.earth;
      const weightedElms = {
        air : (improvements.air / totalElmImprove) * 100,
        water : (improvements.water / totalElmImprove) * 100,
        fire : (improvements.fire / totalElmImprove) * 100,
        earth : (improvements.earth / totalElmImprove) * 100,
      } 

      console.log('POSSIBLE DROPS', possibleItemDrops);
      // RUN FUNCTION TO CHECK FOR FOUND ITEMS
      // the last param is an array of possible items drops
      // the second to Last two params are itemFind and ptFind stats (percentages that boost base of each)
      const { items, pt } = activityItemFind(aXPDiff, lvlAfterBuff, weightedElms, null, null, possibleItemDrops);
    
      foundItems = items;
      improvements["Photon Tokens"] = pt;

      // Now we need to add any items acquired from activities to a user's inventory
      // And also update the avatar's PT
      const updatedAvatar = Object.assign({}, avatar, { photonTokens : avatar.photonTokens += pt, activityXP : aXP, qp: (avatar.qp + qpEarned), power : updatedPower, health : updatedHealth, aether : updatedAether, maxHealth : updatedMaxHealth, fire, earth, water, air, hasBeenUpgraded : true, status : updatedStatus });

      // Finally, Update Avatar in DB
      return Avatar.update(
        {...updatedAvatar},
        { where: { owner: email }, transaction: t, returning: true, plain: true }
      )
    }).then((result) =>{
      let avatar = parseAvatarProperties(result[1]);
      const { getCurrentLevel, getNextLevel, determineRecoveryPerHour } = xpCalc(avatar.activityXP, avatar.battleXP);
      
      avatar.restedEnough = avatar.maxHealth * .8 <= avatar.health;
      const { level, albedo } = getCurrentLevel();
      avatar.level = level;
      avatar.albedo = albedo;
      avatar.nextLevelStartXp = getNextLevel();
      avatar.thisLevelStartXp = getNextLevel(-1);
      avatar.healthRegenRate = determineRecoveryPerHour(avatar.recovery);

      
      // Round down for front end
      for(elm in improvements){
        improvements[elm] = Math.floor(improvements[elm]);
      }
      return returnPackage = {
        avatar,
        improvements,
        reachedLevel : lvlUp ? lvlAfterBuff : null,
        qpEarned : qpe,
        xpGain : aXPDiff,
        items : foundItems
      }
    }).then((returnPackage) =>{
      //console.log('RP=', returnPackage);
      if(returnPackage.items === null){
        return null;
      }
      // Find matching item Templates
      return Items.findAll({
        where : { name : { [Op.in] : returnPackage.items } },
        transaction : t
      }).then((matchingItems) =>{
        const itemsToInsert = []
        // for each item earned, find it's matching item template and push a new item instance into the DB
        returnPackage.items.forEach((item) => {
          const matchingItem = matchingItems.find(itemTemplate => itemTemplate.name === item)
          itemsToInsert.push({ avatarID : returnPackage.avatar.id, itemID : matchingItem.id });
        });
        return AvatarItems.bulkCreate(itemsToInsert, { where: { owner : email }, transaction : t })
      });


    }).then((result) =>{
      // Transaction has been committed
      // result is whatever the result of the promise chain returned to the transaction callback
      return res.formatter.ok(returnPackage);
    }).catch((error) =>{
      // Transaction has been rolled back
      console.log('INSIDE transaction', error);
      return res.formatter.serverError(error.toString(), `Transaction error for ${email} for POST /buff-and-update-avatar Endpoint`);
    });
  });

});

// Retrieve Avatar on login
router.post('/get-avatar', body('email').isEmail(), authenticateJWT, async (req, res) => {
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    return res.formatter.badRequest(errors.array(), "Validation Error - for POST /get-avatar Endpoint");
  }
  const { email } = req.body;

  // 'equipped' refers to 2 things here. the property on the avatar (which is described in the SELECT statement), as well as the equipped boolean that each item posseses. 
  // This query only grabs items that have equipped set to true.
  const q = `
    SELECT avatars.*, equipped 
    FROM avatars
    LEFT OUTER JOIN (SELECT "avatarID", array_agg(json_build_object('equipped', equipped, 'itemID', "itemID")) AS equipped
      FROM avatar_items WHERE avatar_items.equipped=true group by 1) AS equipped ON(id="avatarID")
    WHERE avatars.owner = $1
  `;
  try{
    const [ results ] = await db.query(q, { bind : [email] });
    if(results.length === 0){
      const error = new Error("Error retrieving Hero, Please try again later.");
      return res.formatter.serverError(error.toString(), `No Avatar Saved... Likely from initial account setup failure." ${email} for /get-avatar Endpoint`);
    }
  
    // Non-Whole numbers come out of DB as strings, so need to convert to numbers here
    const avatar = parseAvatarProperties(results[0]);
    const { getCurrentLevel, getNextLevel, determineRecoveryPerHour } = xpCalc(avatar.activityXP, avatar.battleXP);
    const { level, albedo } = getCurrentLevel();
    avatar.level = level;
    avatar.albedo = albedo;
    avatar.nextLevelStartXp = getNextLevel();
    avatar.thisLevelStartXp = getNextLevel(-1);
    avatar.restedEnough = avatar.maxHealth * .8 <= avatar.health;
    avatar.equipped = avatar.equipped === null ? [] : avatar.equipped;
    avatar.healthRegenRate = determineRecoveryPerHour(avatar.recovery);

    return res.formatter.ok( avatar );

  }catch(error){
    console.log(`Couldn't get Avatar for user ${email} DEBUG: ${error}`);
    res.formatter.serverError(error.toString(), `Couldn't get Avatar for user ${email} for /get-avatar Endpoint`);
  }

});

// Check if Avatar name is available
router.post('/check-avatar-name', body('name').isString(), (req, res) => {
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    return res.formatter.badRequest(errors.array(), "Validation Error - for POST /check-avatar-name Endpoint");
  }
  const { name } = req.body;

  Avatar.findAll({ where : { name : { [Op.iLike]: `%${name}%`} }, raw : true })
  .then((results) => {
    const match = results.find(av => av.name.toLowerCase() === name.toLowerCase());
    if(match){
      return res.formatter.ok({ availability : false });
    }
    return res.formatter.ok({ availability : true });
  }).catch((error) =>{
    console.log(`Couldn't search for avatar name ${name}, DEBUG: ${error}`);
    return res.formatter.serverError(error.toString(), `Couldn't search for avatar name ${name} POST /check-avatar-name Endpoint`);
  });

});

/*
RANKING PAGE
*/

// Fetch avatars by page number, with or without search query,  no filter selected
router.post('/fetch-avatars-by-page', body('page').isNumeric(), body('searchInput').isString().optional({nullable: true, checkFalsy: true}), (req, res) =>{
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    return res.formatter.badRequest(errors.array(), "Validation Error - for POST /fetch-avatars-by-page Endpoint");
  }

  const page = req.body.page || 0;
  const pageSize = req.body.pageSize || AVATAR_COUNT_PER_PAGE;
  const searchInput = req.body.searchInput;

  const expression = { 
    attributes : ['id','name','character','power', 'maxHealth', 'recovery', 'armor', 'fire', 'water', 'earth', 'air', 'aether', 'activityXP', 'battleXP', 'battleWins', 'battleLosses', 'battleDraws', 'battleDkos', 'userId', [literal('COALESCE("activityXP", 0) + COALESCE("battleXP", 0)'),'totalXP']],
    include : [
      { model: User, attributes: ['username'] },
      { model: AvatarItems, as : 'equipped', attributes: ['equipped', 'itemID'], 
        where: { equipped : true }, 
        required : false 
      },
    ],
    order : [[ literal('COALESCE("activityXP", 0) + COALESCE("battleXP", 0)'), 'DESC' ]],
    raw : undefined,
    nest : true,
    distinct : true
  };
  
  if(searchInput){
    expression.where = { name: { [Op.iLike]: `%${searchInput}%`}};
  }

  Avatar.findAndCountAll(
    paginate(expression, { page, pageSize })
  ).then(({ rows, count }) =>{
    const avatarCount = count;
    // SHould be 29 pages
    const actualRows = rows.map(r =>{
      const av = r.dataValues;
      av.user = r.user.dataValues;
      return r.dataValues;
    });
    const { currentLevelByInput } = xpCalc();
    //console.log('AR - ', actualRows);
    // Sequelize requires us to loop over the returned data when 'raw : false'
    const avatars = actualRows.map((result, i) => {
      avatar = parseAvatarProperties(result);
      const { level, albedo } = currentLevelByInput(avatar.totalXP);
      avatar.level = level;
      avatar.albedo = albedo;
      avatar.user = avatar.user ? avatar.user  : { username : '' };
      // Determine rank based on page and position within page
      avatar.rank = page === 0 ? i + 1 : (page * AVATAR_COUNT_PER_PAGE) + (i + 1);
      avatar.equipped = avatar.equipped.map((item) =>{
        if(item){
          return item.dataValues.itemID;
        }
        return;
      });

      return avatar;
    });

    const pageCount = Math.ceil(avatarCount/AVATAR_COUNT_PER_PAGE);

    return res.formatter.ok({
      avatars,
      avatarCount,
      pageCount,
      currentPage : page + 1
    });
  }).catch((error)=>{
    console.log(`Couldn't get all Avatars DEBUG: ${error}`);
    res.formatter.serverError(error.toString(), "Retrieved Data Error for POST fetch-avatars-by-page-and-ranking-type Endpoint");
  });
  
});

// Fetch avatars by page number, with or without search query,  FILTER SELECTED
router.post('/fetch-avatars-by-page-and-ranking-type', body('rankingType').isIn(RANKING_FILTER_ACTIVITIES), body('page').isNumeric(), body('searchInput').isString().optional({nullable: true, checkFalsy: true}), (req, res) => {
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    return res.formatter.badRequest(errors.array(), "Validation Error - for /fetch-avatars-by-page-and-ranking-type Endpoint");
  }
  
  const rankingType = req.body.rankingType;
  const page = req.body.page || 0;
  const pageSize = AVATAR_COUNT_PER_PAGE;
  const searchInput = req.body.searchInput;

  const expression = { 
    
    attributes : ['user', rankingType],
    where : { [rankingType] : { [Op.ne]: null} },
    order : [[literal(`"user_totals"."${rankingType}"->\'duration\'`), 'DESC']],
  };

  return UserTotal.findAndCountAll(
    paginate(expression, { page, pageSize })
  ).then(({ rows, count }) =>{
    const fullCount = count;
    // Map user to duration to add to avatars later
    const userDurationMapping = {};
    rows.forEach((r) =>{
      userDurationMapping[r.user] = r[rankingType].duration;
    });

    const expression = {
      attributes : ['id','owner','name','character','power', 'maxHealth', 'recovery', 'armor', 'fire', 'water', 'earth', 'air', 'aether', 'activityXP', 'battleXP', 'battleWins', 'battleLosses', 'battleDraws', 'battleDkos', 'userId', [literal('COALESCE("activityXP", 0) + COALESCE("battleXP", 0)'),'totalXP']],
      include : [
        { model: User, attributes: ['username'] },
        { model: AvatarItems, as : 'equipped', attributes: ['equipped', 'itemID'], 
          where: { equipped : true }, 
          required : false 
        },
      ],
      where : { owner : rows.map(userAndActivity => userAndActivity.user)},
      raw : undefined,
      nest : true,
      distinct : true
    }
    if(searchInput){
      expression.where.name = { [Op.iLike] : `%${searchInput}%`};
    }
    
    Avatar.findAndCountAll(expression).then(({ rows, count }) =>{
      const { currentLevelByInput } = xpCalc();

      const avatarsOrderedByActivityDuration = rows.map(r =>{
        const av = r.dataValues;
        av.activityDuration = userDurationMapping[av.owner];
        return r.dataValues;
      }).sort((a,b) => b.activityDuration - a.activityDuration);
      const avatarCount = fullCount;
      const pageCount = Math.ceil(avatarCount/AVATAR_COUNT_PER_PAGE);
      
      const avatarsWithRank = avatarsOrderedByActivityDuration.map((result, i) => {
        avatar = parseAvatarProperties(result);
        const { level, albedo } = currentLevelByInput(avatar.totalXP);
        avatar.level = level;
        avatar.albedo = albedo;
        avatar.user = avatar.user ? avatar.user  : { username : '' };
        // Determine rank based on page and position within page
        avatar.rank = page === 0 ? i + 1 : (page * AVATAR_COUNT_PER_PAGE) + (i + 1);
        avatar.equipped = avatar.equipped.map((item) =>{
          if(item){
            return item.dataValues.itemID;
          }
          return;
        });
        return avatar;
      });
      return res.formatter.ok({
        avatars : avatarsWithRank,
        avatarCount,
        pageCount,
        currentPage : page + 1
      });

    }).catch((error) =>{
      console.log(`Couldn't get all Avatars DEBUG: ${error}`);
      res.formatter.serverError(error, 'Retrieved Data Error for POST fetch-avatars-by-page-and-ranking-type Endpoint' );
    });
  }).catch((error) =>{
    console.log(`Couldn't get all Avatars DEBUG: ${error}`);
    res.formatter.serverError(error.toString(), 'Retrieved Data Error for POST fetch-avatars-by-page-and-ranking-type Endpoint' );
  });
});

// Fetch avatars by page number, with or without search query,  FILTER SELECTED - Battle
router.post('/fetch-avatars-by-page-and-ranking-type-battle', body('rankingType').equals('battle'), body('page').isNumeric(), body('searchInput').isString().optional({nullable: true, checkFalsy: true}), (req, res) => {
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    return res.formatter.badRequest(errors.array(), "Validation Error - for /fetch-avatars-by-page-and-ranking-type-battle Endpoint");
  }
  
  const page = req.body.page || 0;
  const pageSize = req.body.pageSize || AVATAR_COUNT_PER_PAGE;
  const searchInput = req.body.searchInput;



  const expression = { 
    attributes : ['id','name','character','power', 'maxHealth', 'recovery', 'armor', 'fire', 'water', 'earth', 'air', 'aether', 'activityXP', 'battleXP', 'battleWins', 'battleLosses', 'battleDraws', 'battleDkos', 'userId', [literal('COALESCE("activityXP", 0) + COALESCE("battleXP", 0)'),'totalXP']],
    include : [
      { model: User, attributes: ['username'] },
      { model: AvatarItems, as : 'equipped', attributes: ['equipped', 'itemID'], 
        where: { equipped : true }, 
        required : false 
      },
    ],
    where : { battleXP : { [Op.gt] : 0 } },
    order : [[ 'battleXP', 'DESC' ]],
    raw : undefined,
    nest : true,
    distinct : true
  };
  
  if(searchInput){
    expression.where.name = { [Op.iLike] : `%${searchInput}%`};
  }

  Avatar.findAndCountAll(
    paginate(expression, { page, pageSize })
  ).then(({ rows, count }) =>{
    // SHould be 29 pages
    const actualRows = rows.map(r =>{
      const av = r.dataValues;
      av.user = r.user.dataValues;
      return r.dataValues;
    });
    const { currentLevelByInput } = xpCalc();

    // Sequelize requires us to loop over the returned data when 'raw : false'
    const avatars = actualRows.map((result, i) => {
      avatar = parseAvatarProperties(result);
      const { level, albedo } = currentLevelByInput(avatar.totalXP);
      avatar.level = level;
      avatar.albedo = albedo;
      avatar.user = avatar.user ? avatar.user  : { username : '' };
      // Determine rank based on page and position within page
      avatar.rank = page === 0 ? i + 1 : (page * AVATAR_COUNT_PER_PAGE) + (i + 1);
      avatar.equipped = avatar.equipped.map((item) =>{
        if(item){
          return item.dataValues.itemID;
        }
        return;
      });
      return avatar;
    });
    const avatarCount = count;
    const pageCount = Math.ceil(avatarCount/AVATAR_COUNT_PER_PAGE);
    return res.formatter.ok({
      avatars,
      avatarCount,
      pageCount,
      currentPage : page + 1
    });
  }).catch((error)=>{
    console.log(`Couldn't get all Avatars DEBUG: ${error}`);
    res.formatter.serverError(error.toString(), 'Retrieved Data Error for POST fetch-avatars-by-page-and-ranking-type-battle Endpoint' );
  });
});


/*
  MIGRATION
*/

// Write code to reset all avatars that hasResetStats = false
// router.post('/reset-migration', body('email').isEmail(), (req, res) => {

// });

module.exports = router;