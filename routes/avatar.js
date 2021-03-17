const express = require('express');
const router = express.Router(); 
const { body, validationResult } = require('express-validator');
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
    WHERE avatars.owner = $1
  `;

    try{
    const [ results ] = await db.query(q, { bind : [req.body.email] });
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

/*
RANKING PAGE
*/

// Fetch avatars by page number, with or without search query,  no filter selected
router.post('/fetch-avatars-by-page', function(req, res){
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
    nest : true,
    distinct : true
  };
  
  if(searchInput){
    expression.where = { name: { [Op.iLike]: `%${searchInput}%`}};
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
      avatar.level = currentLevelByInput(avatar.totalXP);
      avatar.user = avatar.user ? avatar.user  : { username : '' };
      // Determine rank based on page and position within page
      avatar.rank = page === 0 ? i + 1 : (page * AVATAR_COUNT_PER_PAGE) + (i + 1);
      return avatar;
    });
    const avatarCount = count;
    const pageCount = Math.ceil(avatarCount/AVATAR_COUNT_PER_PAGE);
    res.status(200).json({
      avatars,
      avatarCount,
      pageCount,
      currentPage : page + 1
    });
  }).catch((err)=>{
    console.log(`Couldn't get all Avatars DEBUG: ${err}`);
    res.status(400).json({
      message: `Couldn't get All Avatars`,
      debug : err
    });
  });
  
});

// Fetch avatars by page number, with or without search query,  filter selected
router.post('/fetch-avatars-by-page-and-ranking-type', body('page').isNumeric(), body('searchInput').isString().optional({nullable: true, checkFalsy: true}),
(req, res) => {
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    return res.formatter.badRequest(errors.array(), "Validation Error - fetch-avatars-by-page-and-ranking-type");
  }
  
  const rankingType = req.body.rankingType;
  console.log('RANKING TYPE = ', rankingType);

  const page = req.body.page || 0;
  const pageSize = AVATAR_COUNT_PER_PAGE;
  const searchInput = req.body.searchInput;

  const paginate = (query, { page, pageSize }) => {
    const offset = page * pageSize;
    const limit = pageSize;
    return { ...query,limit,offset };
  };


  const expression = { 
    attributes : ['user', rankingType],
    where : { [rankingType] :  searchInput ? { name: { [Op.iLike]: `%${searchInput}%`}, [Op.ne]: null } : { [Op.ne]: null} },
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
    
    Avatar.findAndCountAll({
      attributes : ['id','owner','name','character','power', 'maxHealth', 'recovery', 'armor', 'fire', 'water', 'earth', 'air', 'activityXP', 'battleXP', 'battleWins', 'battleLosses', 'battleDraws', 'battleDkos', 'userId', [literal('COALESCE("activityXP", 0) + COALESCE("battleXP", 0)'),'totalXP']],
      include : [
        { model: User, attributes: ['username'] },
        { model: AvatarEquip, as : 'equipped', attributes: ['name','type','equipped','class','description','icon'], where: { equipped : true }, required : false }
      ],
      where : { owner : rows.map(userAndActivity => userAndActivity.user)},
      raw : undefined,
      nest : true,
      distinct : true
    }).then(({ rows, count }) =>{
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
        avatar.level = currentLevelByInput(avatar.totalXP);
        avatar.user = avatar.user ? avatar.user  : { username : '' };
        // Determine rank based on page and position within page
        avatar.rank = page === 0 ? i + 1 : (page * AVATAR_COUNT_PER_PAGE) + (i + 1);
        return avatar;
      });
       res.formatter.ok({
        avatars : avatarsWithRank,
        pageCount,
        currentPage : page + 1
       });
      }).catch((error) =>{
        console.log(`Couldn't get all Avatars DEBUG: ${error}`);
        error = error.toString();
        res.formatter.serverError(error, 'Retrieved Data Error for fetch-avatars-by-page-and-ranking-type endpoint' );
      });


  }).catch((error) =>{
    console.log(`Couldn't get all Avatars DEBUG: ${error}`);
    error = error.toString();
    res.formatter.serverError(error, 'Retrieved Data Error for fetch-avatars-by-page-and-ranking-type endpoint' );
  });

  res.formatter.ok();
});


module.exports = router;