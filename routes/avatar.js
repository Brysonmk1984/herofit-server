const express = require('express');
const router = express.Router(); 
const db = require('../db').db;
const { QueryTypes } = require('sequelize');
const Avatar = require('../db').Avatar;
const AvatarEquip = require('../db').AvatarEquip;
const User = require('../db').User;
const UserTotal = require('../db').UserTotal;
const AppMode = require('../appConfig').config.mode;
const AVATAR_COUNT_PER_PAGE = require('../appConfig').AVATAR_COUNT_PER_PAGE;
const { literal, Op, col, where, fn } = require("sequelize");
const { parseAvatarProperties } = require('../helperFunctions');
const { COMPETITIVE_ACTIVITIES, NONCOMPETITIVE_ACTIVITIES } = require('../game/constants');
const avCalc = require('../game/upgrades/avCalc');
const xpCalc = require('../game/upgrades/xpCalc');


router.post('/insert-avatar', function(req, res, next){
  console.log('INSERTING AV', req.body.avatar);

  if(req.body.email){
    Avatar.findOrCreate({
      where: {
        owner: req.body.owner
      },
      // set the default properties if it doesn't exist
      defaults : Object.assign({},{ ...req.body.avatar }, { userId: req.body.userId, owner: req.body.email, status : 'Rested' })
    }).then((result) =>{
      const created = result[1];
      // Avatar from results, parse properties that are strings that need to be numbers
      avatar = parseAvatarProperties(result[0].dataValues);
      avatar.restedEnough = avatar.maxHealth * .8 <= avatar.health;
      avatar.equipped = [];
      // Avatar Created
      if(created){
        res.status(200).json({
          message: `New Avatar Saved belonging to owner ${avatar.owner}`,
          avatarId : avatar.id,
          avatar,
          hasAvatar : true
        });
        next();
      // Avatar Already exists, using existing instead
      }else if(!created){
        console.log('AVATAR ALREADY EXISTS - ', avatar);
        res.status(200).json({
          message: `Existing avatar for ${avatar.owner}`,
          avatarId : avatar.id,
          avatar,
          hasAvatar : true
        });
        next();
      }else{
        throw new Error("Couldn't find or create avatar");
      }
    }).catch((err) =>{
      console.log(`Couldn't insert Avatar for user ${req.body.email}, DEBUG: ${err}`);
      res.status(400).json({
        message: `Couldn't insert Avatar for user ${req.body.email}`,
        debug : err
      });
      next();
    });
  }else{
    res.status(400).json({
      message: `No Email supplied passed to insert-avatar`,
      debug : `No Email supplied passed to insert-avatar`
    });
  }
});

router.post('/update-avatar', function(req, res, next){
  delete req.body.restedEnough;
  Avatar.update(
    {...req.body.avatar},
    { where: { owner: req.body.email }, raw : true }
  )
  .then(function(result) {
    res.status(200).json({
      message: `${result} record updated --- avatar ${req.body.id}`,
    });
  })
  .catch((err) =>{
    console.log(`Error updating avatar for user ${req.body.email}, DEBUG: ${err}`);
    res.status(400).json({
      message: `Couldn't get Avatar for user ${req.body.email}`,
      debug : err
    });
    next();
  });
});

router.post('/buff-and-update-avatar', function(req, res, next){
  let ut;
  let avStatSnapshot;
  let aXPDiff;
  let lvlUp;
  let lvlAfterBuff;
  let qpe;
  delete req.body.restedEnough;
  
  // First, retrieve userTotals AND avatar from DB
  UserTotal.findOne(
    { where: { user: req.body.email }, attributes: [...COMPETITIVE_ACTIVITIES, ...NONCOMPETITIVE_ACTIVITIES], raw : true }
  ).then((userTotals) =>{
    ut = userTotals;
    
    return Avatar.findOne(
      { where: { owner: req.body.email }, attributes : ['character', 'createdAt','activityXP', 'battleXP', 'power', 'fire', 'earth', 'water', 'air', 'qpFire', 'qpEarth', 'qpWater', 'qpAir', 'qp'], raw : true }
    );
  }).then((avatar) =>{
    avStatSnapshot = Object.assign({}, {activityXP : avatar.activityXP, power : avatar.power, fire : avatar.fire, earth : avatar.earth, water : avatar.water, air : avatar.air});
    
    // Then, Update Avatar Totals
    const { checkLevelUp, calcNewActivityXPFromUt, currentLevelByInput } = xpCalc(avatar.activityXP, avatar.battleXP);
    const { updatePower, updateElements } = avCalc(ut);
    
    
    // Updated aXP
    const aXP = calcNewActivityXPFromUt(ut);
    aXPDiff = aXP - avStatSnapshot.activityXP;
    
    console.log('AXP - ', aXP, avStatSnapshot.activityXP);
    
    const { leveledUp, endingLevel, qpEarned } = checkLevelUp(aXPDiff);
    lvlUp = leveledUp;
    lvlAfterBuff = endingLevel;
    qpe = qpEarned;
    
    
    
    const updatedPower = updatePower();
    const { fire, earth, water, air } = updateElements(avatar.character, { qpFire : avatar.qpFire, qpEarth : avatar.qpEarth, qpWater : avatar.qpWater, qpAir : avatar.qpAir }, avatar.createdAt);
    const updatedAvatar = Object.assign({}, avatar, { activityXP : aXP, qp: (avatar.qp + qpEarned), power : updatedPower, fire, earth, water, air, hasBeenUpgraded : true });
    console.log(avatar, updatedAvatar);
    // Finally, Update Avatar in DB
    return Avatar.update(
      {...updatedAvatar},
      { where: { owner: req.body.email }, returning: true, plain: true }
    );

  }).then((result) =>{
    let avatar = parseAvatarProperties(result[1]);
    const { getCurrentLevel, getNextLevel } = xpCalc(avatar.activityXP, avatar.battleXP);
    
    avatar.restedEnough = avatar.maxHealth * .8 <= avatar.health;
    avatar.level = getCurrentLevel();
    avatar.nextLevelStartXp = getNextLevel();
    avatar.thisLevelStartXp = getNextLevel(-1);

    // Calc gains here to be displayed on frontend
    const improvements = {
      power : Math.floor(avatar.power - avStatSnapshot.power),
      air : Math.floor(avatar.air - avStatSnapshot.air),
      water : Math.floor(avatar.water - avStatSnapshot.water),
      fire : Math.floor(avatar.fire - avStatSnapshot.fire),
      earth : Math.floor(avatar.earth - avStatSnapshot.earth),
    };
    console.log('LVL UP - ', lvlUp, 'REACHEDLEVEL - ', lvlAfterBuff, 'QPE - ', qpe);

    res.status(200).json({
      avatar,
      improvements,
      reachedLevel : lvlUp ? lvlAfterBuff : null,
      qpEarned : qpe,
      xpGain : aXPDiff,
    });
  }).catch((err) =>{
    console.log(`Error updating avatar for user ${req.body.email}, DEBUG: ${err}`);
    res.status(400).json({
      message: `Couldn't get Avatar for user ${req.body.email}`,
      debug : err
    });
    next();
  });

});

router.post('/get-avatar', async function(req, res, next){
  // 'equipped' refers to 2 things here. the property on the avatar (which is described in the SELECT statement), as well as the equipped boolean that each item posseses. 
  // This query only grabs items that have equipped set to true.
  const q = `
    SELECT avatars.*, equipped 
    FROM avatars
    LEFT OUTER JOIN (SELECT "avatarID", array_agg(json_build_object('name', name, 'type', type, 'id', id, 'avatarID', 'avatarID', 'lore', lore, 'effect1', effect1, 'effect2', effect2, 'equipped', equipped, 'class', class, 'description', description, 'icon', icon)) AS equipped
      FROM avatar_equip WHERE avatar_equip.equipped=true group by 1) AS equipped ON(id="avatarID")
    WHERE avatars.owner = '${req.body.email}'
  `;

    try{
    const [ results ] = await db.query(q, {});
    //console.log('RESULT - ', results[0]);
    // Non-Whole numbers come out of DB as strings, so need to convert to numbers here
    const avatar = parseAvatarProperties(results[0]);
      console.log('AVATARR-', avatar);
    const { getCurrentLevel, getNextLevel } = xpCalc(avatar.activityXP, avatar.battleXP);
    avatar.level = getCurrentLevel();
    avatar.nextLevelStartXp = getNextLevel();
    avatar.thisLevelStartXp = getNextLevel(-1);
    avatar.restedEnough = avatar.maxHealth * .8 <= avatar.health;
    avatar.equipped = avatar.equipped === null ? [] : avatar.equipped;
    //console.log('AVATAR - ', avatar);
  
    res.status(200).json({
      avatar
    });
    
  }catch(error){
    console.log(`Couldn't get Avatar for user ${req.body.email} DEBUG: ${error}`);
    res.status(400).json({
      message: `Couldn't get Avatar for user ${req.body.email}`,
      debug : error
    });
    next();
  }


  
  // if(req.body.email){

  //   Avatar.findOne({ where: { owner: req.body.email }, raw : true })
  //     .then((avatar) =>{
  //       if(!avatar){
  //         console.log('NO AV ASSOCIATED WITH EMAIL');
  //         res.status(204).json({
  //           message: `No Avatar associated with user ${req.body.email}`
  //         });
  //         return;
  //       }else{
  //         const { getCurrentLevel, getNextLevel } = xpCalc(avatar.activityXP, avatar.battleXP);
    
  //         avatar.level = getCurrentLevel();
  //         avatar.nextLevelStartXp = getNextLevel();
  //         avatar.thisLevelStartXp = getNextLevel(-1);
  //         // Non-Whole numbers come out of DB as strings, so need to convert to numbers here
  //         avatar = parseAvatarProperties(avatar);
  //         avatar.restedEnough = avatar.maxHealth * .8 <= avatar.health;

  //         AvatarEquip.findAll({ attributes : ['id', 'avatarID', 'type', 'name', 'description', 'equipped', 'icon', 'class' ], where : { avatarID : avatar.id, equipped : true }}, { raw : true, plain : true  })
  //         .then((equipped) =>{
  //           avatar.equipped = equipped;
  //           //console.log('equip! - ', equipped);
  //           console.log('AVA - ', avatar);
  //           res.status(200).json({
  //             message: `Found matching Avatar`,
  //             avatar,
  //           });
  //           next();
  //         }).catch((error) =>{
  //           res.status(400).json({
  //             message: `Unable to Fetch Hero Items`,
  //             debug : error
  //           });
  //           next();
  //         });
  //       }
  //     }).catch((err)=>{
  //       console.log(`Couldn't get Avatar for user ${req.body.email} DEBUG: ${err}`);
  //       res.status(400).json({
  //         message: `Couldn't get Avatar for user ${req.body.email}`,
  //         debug : err
  //       });
  //       next();
  //     });
  // }else{
  //   res.status(400).json({
  //     message: `No Email supplied passed to get-avatar`,
  //     debug : `No Email supplied passed to get-avatar`
  //   });
  //   next();
  // }
  

});


router.post('/get-all-avatars', function(req, res, next){


  Avatar.findAll({attributes : ['name','character','power', 'maxHealth', 'recovery', 'armor', 'fire', 'water', 'earth', 'air', 'activityXP', 'battleXP', 'battleWins', 'battleLosses', 'battleDraws', 'battleDkos'], include : [{ model: User, attributes: ['username'] }], raw : false})
  .then((results) =>{
    const { currentLevelByInput } = xpCalc();
    // Sequelize requires us to loop over the returned data when 'raw : false'
    const avatars = results.map((result) => {
      avatar = result.get({ plain: true });
      avatar = parseAvatarProperties(avatar);
      avatar.level = currentLevelByInput(avatar.activityXP + avatar.battleXP);
      avatar.user = avatar.user ? avatar.user  : { username : '' };
      return avatar;
    });
    //console.log('avatars', avatars);
    // IN THE FUTURE, TRIM AVATAR FIELDS,  DONT NEED ALL OF THEM FOR RANKING PAGE
    res.status(200).json({
      message: `Retrieved All Avatars`,
      avatars
    });
    next();
  }).catch((err)=>{
    console.log(`Couldn't get all Avatars DEBUG: ${err}`);
    res.status(400).json({
      message: `Couldn't get All Avatars`,
      debug : err
    });
    next();
  });
});

router.post('/fetch-avatars-by-page-number', function(req, res, next){
  const page = req.body.page || 0;
  const pageSize = req.body.pageSize || AVATAR_COUNT_PER_PAGE;
  const searchInput = req.body.searchInput;
  
  const paginate = (query, { page, pageSize }) => {
    const offset = page * pageSize;
    const limit = pageSize;

    return {
      ...query,
     
      limit,
       offset,
   
    };
  };

  const expression = { 
    attributes : ['id','name','character','power', 'maxHealth', 'recovery', 'armor', 'fire', 'water', 'earth', 'air', 'activityXP', 'battleXP', 'battleWins', 'battleLosses', 'battleDraws', 'battleDkos', 'userId', [literal('COALESCE("activityXP", 0) + COALESCE("battleXP", 0)'),'totalXP']],
    include : [
      { model: User, attributes: ['username'] },
      { model: AvatarEquip, as : 'equipped', attributes: ['name','type','equipped','class','description','icon'], where: { equipped : true }, required : false }
    ],
    order : [[ literal('COALESCE("activityXP", 0) + COALESCE("battleXP", 0)'), 'DESC' ]],
    raw : undefined,
    nest : true
  };
  if(searchInput){
    expression.where = { name: { [Op.iLike]: `%${searchInput}%`}};
  }

  Avatar.findAndCountAll(
    paginate(expression, { page, pageSize })
  ).then(({ rows, count }) =>{
    const actualRows = rows.map(r =>{
      const av = r.dataValues;
      av.user = r.user.dataValues;
      return r.dataValues;
    });
    const { currentLevelByInput } = xpCalc();

    // Sequelize requires us to loop over the returned data when 'raw : false'
    const avatars = actualRows.map((result, i) => {
      avatar = parseAvatarProperties(result);
      avatar.level = currentLevelByInput(avatar.totalXP);
      avatar.user = avatar.user ? avatar.user  : { username : '' };
      // Determine rank based on page and position within page
      avatar.rank = page === 0 ? i + 1 : (page * AVATAR_COUNT_PER_PAGE) + (i + 1);
      return avatar;
    });
    const avatarCount = count;
    const pageCount = Math.ceil(avatarCount/AVATAR_COUNT_PER_PAGE)-1;

    res.status(200).json({
      avatars,
      avatarCount,
      pageCount,
      currentPage : page + 1
    });
    next();
  }).catch((err)=>{
    console.log(`Couldn't get all Avatars DEBUG: ${err}`);
    res.status(400).json({
      message: `Couldn't get All Avatars`,
      debug : err
    });
    next();
  });
  
});

router.get('/get-avatar-and-page-count', function(req, res, next){


  Avatar.findAndCountAll()
  .then((data) =>{
    const avatarCount = data.count;
    const pageCount = Math.ceil(avatarCount/20);
    
    res.status(200).json({
      avatarCount,
      pageCount,
      currentPage : 1,
    });
    next();
  }).catch((err)=>{
    console.log(`Couldn't get all Avatars DEBUG: ${err}`);
    res.status(400).json({
      message: `Couldn't get All Avatars`,
      debug : err
    });
    next();
  });

});

// QUERY NO LONGER WORKS, SWITCH TO NEW EQUIPMENT TABLE
// router.post('/add-title-to-avatar', async function(req, res, next){

//   const title = JSON.stringify([{
//     id : req.body.id,
//     title : req.body.title,
//     type : req.body.type,
//     description : req.body.description,
//   }]);
//   console.log('HSF - ', title);
//   const query = `UPDATE avatars SET titles = '${title}' WHERE name='${req.body.hero}';`;

//   try{
//     const [results, metadata] = await db.query(query, {});

//     console.log('results!', metadata);
//     if(results){
//       res.status(200).json({
//         results
//       });
//     }else{
//       res.send(400);
//     }
//   }catch(error){
//     console.log("error", error);
//   }
// });


module.exports = router;