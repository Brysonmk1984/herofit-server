const express = require('express');
const router = express.Router(); 
const db = require('../config/db').db;
const { body, validationResult } = require('express-validator');
const { authenticateJWT } = require('../jwt/validateJWT');
const { Avatar, AvatarItems, User, UserTotal } = require('../config/db');

const { literal, Op } = require("sequelize");
const { parseAvatarProperties, paginate, range } = require('../lib/helperFunctions');
const xpCalc = require('../game/upgrades/xpCalc');
const { activityStatRewards, activityLevelRewards, determineStatImprovements } = require('../game/activities/activityRewards');
const { sendBackendOnlyEmail }= require('../mail');
const RANKING_FILTER_ACTIVITIES = ['ride', 'weightTraining', 'hike', 'yoga', 'walk', 'rowing', 'stairStepper', 'elliptical', 'swim', 'crossfit', 'run', 'kayaking'];
const heroList = require("../heroList.json");
const upgradeProcess = require('../game/activities/upgradeProcess');
const AVATAR_COUNT_PER_PAGE = 20;
const { specialEvent } = require('../appConfig').config;


// App signup award item
async function appSignupAward(avatarID, itemID, checkForDuplicate, t = null){
  const item = { avatarID, itemID };
  try{
    if(checkForDuplicate){
      const databaseItem = await AvatarItems.findOne({ where : { itemID, avatarID }, transaction : t});
      if(databaseItem){
        return;
      }
    }
    const result = await AvatarItems.create(item, t ? {transaction : t} : null);
    return "Received the Snowshoe Hare pet, check your inventory!"
  }catch(error){console.log('should be here');
    sendBackendOnlyEmail("Couldn't perform signupAward!", error.toString());
    throw error;
  }
}


// Create Avatar in DB after Signup
router.post('/insert-avatar', body('avatar').isObject(), body('userId').isNumeric(), body('email').isEmail(), authenticateJWT, async (req, res) => {
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    return res.formatter.badRequest(errors.array(), "Validation Error - for POST /insert-avatar Endpoint");
  }
  
  let { avatar, userId, email } = req.body;

  // This is to allow the user to Go To Battle after signup.
  if(avatar.status === 'New Recruit'){
    avatar.status = 'Rested';
  }


    try{
      const result = await Avatar.findOrCreate({
        where: { owner : email },
        // set the default properties if it doesn't exist
        defaults : Object.assign({},{ ...avatar }, { userId, owner: email})
      });

      const created = result[1];
      // Avatar from results, parse properties that are strings that need to be numbers
      avatar = parseAvatarProperties(result[0].dataValues);
      avatar.restedEnough = avatar.maxHealth * .8 <= avatar.health;
      avatar.equipped = [];
      const { colors, alias } = heroList.find(av => av.character === avatar.character);
      avatar.alias = alias
      avatar.colors = colors;
  
      try{

        const returnObj = {
          avatarId : avatar.id,
          avatar,
          hasAvatar : true,
          awardedItemMessage : null
        }

        // Check to Award Snowshoe Hare
        if(specialEvent && specialEvent.eventName === "App Welcome"){
          try{
            const awardedItemMessage = await appSignupAward(avatar.id, specialEvent.actionTypes[0].itemID, false);
            returnObj.awardedItemMessage = awardedItemMessage;
            return res.formatter.ok(returnObj);
          }catch(error){
            // Couldn't award item, but we still want the user to continue since the avatar was made
            // An email has been sent about the problem
            return res.formatter.ok(returnObj);
          }
        }else{
          return res.formatter.ok(returnObj);
        }
      }catch(error){
        throw error;
      }
    }catch(error){
      return (async () =>{
        console.log(`Couldn't insert Avatar for user ${email}, DEBUG: ${error}`);
        // Need to delete user, otherwise it's floating around without an avatar
        try{
          const result = await Avatar.destroy({ where : { owner : email } });
          if(result === 1){
            await User.destroy({ where : { id : userId }});
            sendBackendOnlyEmail("Major Error in user signup Deleting user and Avatar", error.toString());
            return res.formatter.serverError({ message : 'There was a problem creating your account, try again later.' });
          }else{
            sendBackendOnlyEmail("Major Error in user signup, no avatar to delete, theres a floating user account without an avatar", error.toString());
            return res.formatter.serverError({ message : 'There was a problem creating your account, try again later.' });
          }
        }catch(error){
          sendBackendOnlyEmail("Major Error in user signup, and User didnt get destroryed", error.toString());
          return res.formatter.serverError(error.toString(), `There was a problem creating your account, try again later.`);
        }
      })();
    }

  
});

// Update Avatar without full buff sequence. Used when spending QP points
router.post('/update-avatar-stats', body('avatar').isObject(), body('email').isEmail(), authenticateJWT, (req, res) => {

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
    const statObjForUpgrade = {
      fire : [Math.floor(avatar.fire)],
      earth : [Math.floor(avatar.earth)],
      water : [Math.floor(avatar.water)],
      air : [Math.floor(avatar.air)]
    };
    
    // if player hits a certain award based on stat level, award them the item
    activityStatRewards(avatar.id, statObjForUpgrade)
    .then((rewards) =>{
      if(rewards){
        return res.formatter.ok(rewards);
      }
      res.formatter.ok();
    }).catch((error) => {
      console.log('ERROR in activityRewards');
      throw error;
    });

  }).catch((error) =>{
    console.log(`Error updating avatar for user ${email}, DEBUG: ${error}`);
    res.formatter.serverError(error.toString(), `Couldn't get Avatar for user ${email} for POST /update-avatar Endpoint`);
  });
});

// When a user applies their latest Strava activities, adjust avatar
router.post('/upgrade-sequence', body('email').isEmail(), body('activities').isArray(), body('activities').custom((activities) =>{
    const invalidActivities = activities.find(act => !act.id && act.source === 'strava');
    // In case the activities are invalid... this should eventually be moved to the validation middleware.
    return invalidActivities ? res.formatter.serverError(error.toString(), `Error updating latest activity to user table for user  ${email} - POST /upgrade-sequence Endpoint, One or more activities are invalid: ACT - ${invalidActivities}`) : true;
}), body('accountDate').isString(), body('hasBeenUpgraded').isBoolean(), authenticateJWT, (req, res) => {
 
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    return res.formatter.badRequest(errors.array(), "Validation Error - for POST /upgrade-sequence Endpoint");
  }

  const { email, activities, accountDate, hasBeenUpgraded } = req.body;
  //console.log('HEREREERRERER', email, activities, accountDate, hasBeenUpgraded);

  // Runs entire upgrade sequence, returns { activities, avatar, improvements, reachedLevel, qpEarned, xpGain, items, rewards }
  upgradeProcess(email, activities, accountDate, hasBeenUpgraded)
  .then((returnPackage) =>{
    //console.log('return package!', returnPackage);
    // Transaction has been committed
    // result is whatever the result of the promise chain returned to the transaction callback
    return res.formatter.ok(returnPackage);
  }).catch((error) =>{
    // Transaction has been rolled back
    console.log('INSIDE transaction', error);
    return res.formatter.serverError(error.toString(), `Transaction error for ${email} for POST /upgrade-sequence Endpoint`);
  });
  

});

// Retrieve Avatar on login
// Mobile app check only for awarding pet
router.post('/get-avatar', body('email').isEmail(), body('isMobileApp').isBoolean().optional({nullable: true, checkFalsy: true}), authenticateJWT, async (req, res) => {
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    return res.formatter.badRequest(errors.array(), "Validation Error - for POST /get-avatar Endpoint");
  }
  const { email, isMobileApp } = req.body;
  console.log('POINT 1', email, isMobileApp);
  // 'equipped' refers to 2 things here. the property on the avatar (which is described in the SELECT statement), as well as the equipped boolean that each item posseses. 
  // This query only grabs items that have equipped set to true.
  const q = `
    SELECT avatars.*, equipped 
    FROM avatars
    LEFT OUTER JOIN (SELECT "avatarID", array_agg(json_build_object('equipped', equipped, 'itemID', "itemID")) AS equipped
      FROM avatar_items WHERE avatar_items.equipped=true group by 1) AS equipped ON(id="avatarID")
    WHERE avatars.owner = $1
  `;
  try{console.log('POINT 2');
    const [ results ] = await db.query(q, { bind : [email] });
    if(results.length === 0){console.log('POINT A', 'NO RESULTS');
      const error = new Error("Error retrieving Hero, Please try again later.");
      return res.formatter.serverError(error.toString(), `No Avatar Saved... Likely from initial account setup failure." ${email} for /get-avatar Endpoint`);
    }
    
    // Non-Whole numbers come out of DB as strings, so need to convert to numbers here
    const avatar = parseAvatarProperties(results[0], true);
    console.log('POINT 3', avatar);
    const { getCurrentLevel, getNextLevel, determineRecoveryPerHour } = xpCalc(avatar.activityXP, avatar.battleXP);
    const { level, albedo } = getCurrentLevel();
    avatar.level = level;
    avatar.albedo = albedo;
    avatar.nextLevelStartXp = getNextLevel();
    avatar.thisLevelStartXp = getNextLevel(-1);
    avatar.restedEnough = avatar.maxHealth * .8 <= avatar.health;
    avatar.equipped = avatar.equipped === null ? [] : avatar.equipped;
    avatar.healthRegenRate = determineRecoveryPerHour(avatar.recovery);
    const { colors, alias } = heroList.find(av => av.character === avatar.character);
    avatar.alias = alias
    avatar.colors = colors;
    console.log('POINT 4');
    let awardedItemMessage = null;
    // Check to Award Snowshoe Hare
    if(isMobileApp && specialEvent && specialEvent.eventName === "App Welcome"){
      try{console.log('POINT 5');
        awardedItemMessage = await appSignupAward(avatar.id, specialEvent.actionTypes[0].itemID, true);
        return res.formatter.ok( { avatar, awardedItemMessage } );
      }catch(error){console.log('POINT B', error);
        return res.formatter.serverError(error.toString(), `Couldn't get Avatar for user, but with awarding item for /get-avatar Endpoint`);
      }
    }console.log('POINT 6');
    return res.formatter.ok( { avatar, awardedItemMessage } );
  }catch(error){console.log('POINT C', error);
    console.log(`Could not get Avatar for user ${email} DEBUG: ${error}`);
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
// router.get('/reset-migration', (req, res) => {
//   Avatar.findAll({where:{ hasResetStats : false }, raw : true})
//   .then((results)=> {
//     const allPromises = [];
//     for(let i = 0; i< results.length; i++){
//       allPromises.push(itemEffects([{ name : 'Reset Hero' }], results[i].id, results[i].owner ));
//     }
//     return Promise.allSettled(allPromises);
//   }).then((results) =>{
//     AvatarItems.destroy({ where : { itemID : 31 } })
//   }).then(() =>{
//     res.formatter.ok('Success!');
//   }).catch((error) =>{
//     res.formatter.serverError(error.toString());
//   });
// });



// router.get('/test-item-check', async (req, res) => {
//   try{
//     const result = specialEvent && specialEvent.eventName === "App Welcome" && await appSignupAward(288, specialEvent.actionTypes[0].itemID, true);
//     console.log(result);
//     res.formatter.ok(result);
//   }catch(error){
//     console.log(error);
//     res.formatter.serverError(error.toString());
//   }
// });

module.exports = router;