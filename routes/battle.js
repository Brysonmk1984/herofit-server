const express = require('express');
const router = express.Router(); 
const { Op } = require("sequelize");
const Avatar = require('../db').Avatar;
const AvatarEquip = require('../db').AvatarEquip;
const Battle = require('../db').Battle;
const { selectFoeTemplate, generateFoeStats } = require('../game/foeFunctions');
const villains = require('../game/villains.json');
const xpCalc = require('../game/upgrades/xpCalc');
const { determineXpBounty, determinePtBounty } = require('../game/runPostBattleActions');
const { determinePostBattleActions } = require('../game/onGoToBattle');
const { OUTCOME_XP } = require('../game/constants'); 

// USER CLICKED 'GO TO BATTLE'
router.post('/insert-battle', function(req, res, next){

  // If an avatar is not sent, which can happen the first attempt, send 400 error.
  if(!req.body.avatar){
    return res.status(400).json({
      message: `Couldn't Go To Battle, please try again!`,
      debug: `Couldn't send avatar to battle because no avatar was sent to server.`
    });
  }else if(!req.body.email){
    return res.status(400).json({
      message: `Couldn't Go To Battle, please try again!`,
      debug: `Couldn't send avatar to battle because no email associated with account was sent to server.`
    });
  }

  const avatar = req.body.avatar
  const { currentLevelByInput } = xpCalc();
  const currentLevel = currentLevelByInput(avatar.activityXP + avatar.battleXP);


  const foeTemplate = selectFoeTemplate(currentLevel);

  let foeName;

  if(foeTemplate.type === 'Shadow-Self'){
    foeName = `Shadow ${avatar.name}`;
  }else{
    foeName = foeTemplate.foe[Math.floor(Math.random() * foeTemplate.foe.length)];
  }

  const foe = {
    id : foeTemplate.id,
    type : foeTemplate.type,
    name : foeName,
    ability : foeTemplate.ability,
    class : foeTemplate.class
  }
  const foeWithStats = Object.assign({}, foe, generateFoeStats(avatar, foe));

  
  foeWithStats.xpBounty = determineXpBounty(OUTCOME_XP.base, foeWithStats.difficulty, currentLevel, foeTemplate.bonusXpBase);
  foeWithStats.ptBounty = determinePtBounty(currentLevel, foeTemplate.bonusPtBase);
  
  console.log('FWS! - ', foeWithStats);

  // PROMISE - need to determine previous battles.
  new Promise((resolve, reject) =>{
    return determinePostBattleActions(avatar, foeWithStats, resolve, reject);
  }).then((postBattleActions) =>{

    console.log('PBA BEFORE BATTLE INSERTION', postBattleActions);

    Battle.create({
      owner: req.body.email,
      avatarID: avatar.id,
      avatarName: avatar.name,
      foe : foeWithStats,
      outcome: "TBD",
      seenReport : false,
      postBattleActions
    }, 
    {raw : true}
    ).then((result) =>{

      return Avatar.update({ 
        goToBattle : true,
      },{ where: { owner: req.body.email }, raw: true })
      .then((result) =>{
        if(!result){
          res.status(204).json({
            message: `No Avatar associated with user ${req.body.email}`
          });
          return;
        }
        res.status(200).json({
          message : 'Avatar set for battle',
          goToBattle : true,
          foe : foeWithStats
        });
        next();
      }).catch((err)=>{
        console.log(`Couldn't Send Avatar to battle: ${err}`);
        res.status(400).json({
          message: `Couldn't send avatar to battle`,
          debug : err
        });
        next();
      });


    }).catch((error) =>{
      console.log('ERROR INSERTING battle', error);
    });
  })

});

// USER CLICKED 'DONT GO TO BATTLE'
router.post('/remove-battle', function(req, res, next){
  Battle.destroy({
    where: { avatarID: req.body.avatarID },
  }, 
  {raw : true}
  ).then((result) =>{
    console.log('BATTLE REMOVED', result);
    
    return Avatar.update({ 
      goToBattle : false,
    },{ where: { owner: req.body.email }, raw: true });
    
  }).then((result) =>{
    if(!result){
      throw new CustomError('Unable to Remove Battle',`No Avatar associated with user ${req.body.email}`);
    }
    res.status(200).json({
      message : 'Avatar removed from battle',
      goToBattle : false,
    });
    next();
  }).catch((err)=>{
    console.log(`Couldn't Remove AVATAR from Battle: ${err}`);
    res.status(400).json({
      message: `Couldn't remove AVATAR from Battle`,
      debug : err
    });
    next();
  })
});

// USER Logs in after a battle, or clicks button to retrieve report
router.post('/fetch-battle-report', function(req, res, next){
  Battle.findAll({
    limit: 1,
    where: { 
      avatarID: req.body.avatarID,
      [Op.not]: { outcome: "TBD" }
    },
    order: [ [ 'createdAt', 'DESC' ]],
    raw : true
  }).then((result) =>{
    if(result.length){
      //console.log('RESBATTLE - ', result[0]);

      adjResult = result[0];
      adjResult.aPhyReduction = Math.floor(parseInt(adjResult.aPhyReduction));
      adjResult.fPhyReduction = Math.floor(parseInt(adjResult.fPhyReduction));
      if(!result[0].seenReport){

        res.status(200).json({
          message : 'Retrieved Latest Battle Results',
          result : result[0]
        });

      }else{
        res.status(200).json({
          message : 'Latest Report already viewed',
          result : null
        });
      }
    }else{
      throw new Error('Data Error','No Battle Results');
    }

  }).catch((error) =>{
    res.status(200).json({
      message: `No Results`,
      result : null
    });
  });
});

router.post('/fetch-battle-report-by-id', function(req, res, next){
  const avatarID = req.body.avatarID;

  Battle.findOne({
    where: { 
      id: req.body.id,
    },
    raw : true
  }).then((result) =>{
    adjResult = result;
    adjResult.aPhyReduction = Math.floor(parseInt(adjResult.aPhyReduction));
    adjResult.fPhyReduction = Math.floor(parseInt(adjResult.fPhyReduction));
   
    //console.log('FETCHING AVATAR INV FOR -', avatarID);
    return AvatarEquip.findOne({ 
      attributes : ['name'],
      where : { avatarID, type : 'skin', equipped : true },
      raw : true
    });
  }).then((skin) =>{
    //console.log('SKIN - ', skin);
    adjResult.avatarSkin = skin;
    res.status(200).json({
      adjResult
    });
    
  }).catch((error) =>{
    res.status(200).json({
      message: `No Results`,
      result : null
    });
  });
});

router.post('/update-battle-report-seen', function(req, res, next){
  Battle.update({ seenReport : true},{ where: { id : req.body.id } })
  .then(()=>{
    console.log('updated seenBy');
    res.status(200).json({
      message : 'Successfully updated seenReport',
    });
  }).catch((err) =>{
    console.log("couldn't update seen by", err);
    res.status(401).json({
      message : 'Failed to update seenReport',
    });
  });
});

// USER Logs in after a battle, or clicks button to retrieve report
router.get('/villain-list', function(req, res, next){
  if(villains){
    res.status(200).json({
      villains
    });
  }else{
    res.status(400).json({
      debug : "couldn't retrieve villain list"
    });
  }
});

router.post('/fetch-battles-won', function(req, res, next){
  
  Battle.findAll({ 
      where : { 
        avatarID: req.body.avatarID, 
        [Op.or]: [{ outcome: 'Avatar Wins' }, { outcome: 'Double KO' }] 
      }, 
      raw : true, 
      attributes: ['outcome', 'foe'] 
  }).then((battles) =>{
    if(battles){
      res.status(200).json({
        battles
      });
    }else{
      res.status(400).json({
        debug : "couldn't retrieve villain list"
      });
    }
  }).catch(() =>{

  })

});

router.post('/fetch-upcoming-foe', function(req, res, next){
  console.log(req.body)
  Battle.findOne({ 
      where : { 
        avatarID: req.body.avatarID, 
        outcome: "TBD" 
      }, 
      raw : true, 
      attributes: ['foe'] 
  }).then((battle) =>{
    console.log(`upcoming battle for ${req.body.avatarID} - `, battle);
    if(battle){
      res.status(200).json({
        foe : battle.foe
      });
    }
    
    
    /*else{
      Avatar.update(
        { goToBattle : false },
        { where : { id : req.body.avatarID } }
      ).then((data) =>{
        res.status(422).json({
          debug : "Couldn't retrieve foe for upcoming battle! No Battle Record listed.",
          message : "No Upcoming battle on Record."
        });
      }).catch((err) =>{
        res.status(400).json({
          debug : err,
          message : "Unable to Reset goToBattle status."
        });
      });

    }*/
  }).catch((error) =>{console.log('THE ERR', error);
    res.status(400).json({
      debug : "couldn't retrieve foe for upcoming battle!",
      error
    });
  })
});
module.exports = router;