const express = require('express');
const router = express.Router(); 
const { Op } = require("sequelize");
const Avatar = require('../db').Avatar;
const AvatarEquip = require('../db').AvatarEquip;
const Battle = require('../db').Battle;
const { selectFoeTemplate, generateFoeStats } = require('../game/foeFunctions');
const villains = require('../game/villains.json');
const xpCalc = require('../game/upgrades/xpCalc');
const avCalc = require('../game/upgrades/avCalc');
const moment = require('moment');
const { determineXpBounty, determinePtBounty } = require('../game/runPostBattleActions');
const { determinePostBattleActions } = require('../game/onGoToBattle');
const { OUTCOME_XP } = require('../game/constants'); 
const ALLPBAs = require('../game/postBattleActions.json');
const ALLITEMS = require('../game/allItems.json');

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
    // specific foe for testing purposes
    //foeName = foeTemplate.foe[5];
    
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
          res.status(400).json({
            message: `No Avatar associated with user ${req.body.email}`
          });
          return;
        }

        const rewards = postBattleActions.map(action => {
          let matchingPBA;
          for(let actionType in ALLPBAs){
            const match = ALLPBAs[actionType].find(pba => {
              console.log(pba.action, action);
              return pba.action === action;
            });
            if(match){
              return matchingPBA = match;
            }
          } 
          return ALLITEMS[matchingPBA.itemCategory][matchingPBA.name]
        });


        res.status(200).json({
          message : 'Avatar set for battle',
          goToBattle : true,
          foe : foeWithStats,
          rewards
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
     
      // IF the avatar won, Get the items aquired from the action types in the battle report
      if(adjResult.outcome === 'Avatar Wins'){
        adjResult.itemsAquired = adjResult.postBattleActions.map(action => {
          let matchingPBA;
          for(let actionType in ALLPBAs){
            const match = ALLPBAs[actionType].find(pba => {
              console.log(pba.action, action);
              return pba.action === action;
            });
            if(match){
              return matchingPBA = match;
            }
          } 
          return ALLITEMS[matchingPBA.itemCategory][matchingPBA.name]
        });
      }

      if(!result[0].seenReport){
        // Figure out which season it is, so a 25% bonus can be given to BRA & BRF
        const { determineAstrologySeason } = avCalc();
        adjResult.seasonalBonusElement =  determineAstrologySeason(adjResult.createdAt).element;

        res.status(200).json({
          message : 'Retrieved Latest Battle Results',
          result : adjResult
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
    console.log('ERR', error);
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
    // IF WIN, Get the items aquired from the action types in the battle report
    if(adjResult.outcome === 'Avatar Wins'){
      adjResult.itemsAquired = adjResult.postBattleActions.map(action => {
        let matchingPBA;
        for(let actionType in ALLPBAs){
          const match = ALLPBAs[actionType].find(pba => {
            //console.log(pba.action, action);
            return pba.action === action;
          });
          if(match){
            return matchingPBA = match;
          }
        } 
        return ALLITEMS[matchingPBA.itemCategory][matchingPBA.name];
      });
    }


    //console.log('FETCHING AVATAR INV FOR -', avatarID);
    return AvatarEquip.findOne({ 
      attributes : ['name'],
      where : { avatarID, type : 'skin', equipped : true },
      raw : true
    });
  }).then((skin) =>{
    //console.log('SKIN - ', skin);
    adjResult.avatarSkin = skin;

    // Figure out which season it is, so a 25% bonus can be given to BRA & BRF
    const { determineAstrologySeason } = avCalc();
    const startedTrackingSeasons = moment('2021-03-04', 'YYYY-MM-DD');
    const battleDate = moment(adjResult.createdAt);
    if(battleDate && battleDate.isAfter(startedTrackingSeasons)){
      adjResult.seasonalBonusElement =  determineAstrologySeason(adjResult.createdAt).element;
    }else{ adjResult.seasonalBonusElement = null; }
    res.status(200).json({
      adjResult
    });
    
  }).catch((error) =>{console.log('ERRR', error);
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

router.post('/fetch-upcoming-foe-and-rewards', function(req, res, next){
  console.log(req.body)
  Battle.findOne({ 
      where : { 
        avatarID: req.body.avatarID, 
        outcome: "TBD" 
      }, 
      raw : true, 
      attributes: ['foe', 'postBattleActions'] 
  }).then((battle) =>{
    console.log(`upcoming battle for ${req.body.avatarID} - `, battle);
    if(battle){
      let rewards = null;
      if(battle.postBattleActions){
        //console.log(battle.postBattleActions);
        // Get the items aquired from the action types in the battle report
        rewards = battle.postBattleActions.map(action => {
          let matchingPBA;
          for(let actionType in ALLPBAs){
            const match = ALLPBAs[actionType].find(pba => {
              return pba.action === action;
            });
            if(match){
              matchingPBA = match;
              break;
            }
          } 
          //console.log('MBPA - ',matchingPBA);
          return ALLITEMS[matchingPBA.itemCategory].find(item => item.name === matchingPBA.name);
        });
      }

      res.status(200).json({
        foe : battle.foe,
        rewards
      });
    }else{
      console.log(`COULDNT FIND BATTLE ${req.body.avatarID}`, battle);

      res.status(422).json({
        debug : `Couldn't retrieve foe for upcoming battle! No Battle Record listed. USER - ${req.body.avatarID}`,
        battleObj : battle,
        message : "No Upcoming battle on Record."
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