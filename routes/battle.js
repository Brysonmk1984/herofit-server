const express = require('express');
const router = express.Router(); 
const { Op } = require("sequelize");
const moment = require("moment");
const Avatar = require('../db').Avatar;
const Battle = require('../db').Battle;
const { selectFoeTemplate } = require('../game/foeFunctions');
const villains = require('../game/villains.json');

// USER CLICKED 'GO TO BATTLE'
router.post('/insert-battle', function(req, res, next){
  const foeTemplate = selectFoeTemplate();
  const foe = {
    id : foeTemplate.id,
    type : foeTemplate.type,
    name : foeTemplate.foe[Math.floor(Math.random() * foeTemplate.foe.length)],
    ability : foeTemplate.ability
  }
  console.log('FOE!', foe, req.body.email, req.body.avatarID, req.body.avatarName)
  Battle.create({
    owner: req.body.email,
    avatarID: req.body.avatarID,
    avatarName: req.body.avatarName,
    foe,
    outcome: "TBD"
  }, 
  {raw : true}
  ).then((result) =>{
    console.log('BATTLE INSERTED!!', result);

    Avatar.update({ 
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
      const withinLastDay =  moment.utc().subtract(1,"day").isBefore(result[0].updatedAt);
      if(withinLastDay){
        res.status(200).json({
          message : 'Retrieved Latest Battle Results',
          result : result[0]
        });
      }else{
        throw new Error('Data Error','Outdated Results');
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

router.post('/fetch-battles-fought', function(req, res, next){
  
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

module.exports = router;