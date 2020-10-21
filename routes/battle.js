const express = require('express');
const router = express.Router(); 
const Avatar = require('../db').Avatar;
const Battle = require('../db').Battle;
const { selectFoeTemplate } = require('../game/foeFunctions');


// USER CLICKED 'GO TO BATTLE'
router.post('/insert-battle', function(req, res, next){
  const foeTemplate = selectFoeTemplate();
  const foe = {
    id : foeTemplate.id,
    type : foeTemplate.type,
    name : foeTemplate.foe[Math.floor(Math.random() * foeTemplate.foe.length)],
    ability : foeTemplate.ability
  }
  Battle.create({
    owner: req.body.email,
    avatarID: req.body.avatarID,
    avatarName: req.body.avatarName,
    foe,
    outcome: "TBD"
  }, 
  {raw : true}
  ).then((result) =>{
    console.log('BATTLE INSERTED', result);

    Avatar.update({ 
      goToBattle : true,
      status : 'Awaiting Battle'
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
        status : 'Awaiting Battle'
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
    
    Avatar.update({ 
      goToBattle : false,
      status : 'Rested'
    },{ where: { owner: req.body.email }, raw: true })
    .then((result) =>{
      if(!result){
        res.status(204).json({
          message: `No Avatar associated with user ${req.body.email}`
        });
        return;
      }
      res.status(200).json({
        message : 'Avatar removed from battle',
        goToBattle : false,
        status : 'Rested'
      });
      next();
    }).catch((err)=>{
      console.log(`Couldn't Remove AVATAR from Battle: ${err}`);
      res.status(400).json({
        message: `Couldn't remove AVATAR from Battle`,
        debug : err
      });
      next();
    });

  }).catch((error) =>{
    console.log('ERROR REMOVING battle', error);
  });
});

// USER Logs in after a battle, or clicks button to retrieve report
router.post('/fetch-battle-report', function(req, res, next){
  Battle.findAll({
    limit: 1,
    where: { avatarID: req.body.avatarID },
    order: [ [ 'createdAt', 'DESC' ]],
    raw : true
  }).then((result) =>{
    res.status(200).json({
      message : 'Retrieved Latest Battle Results',
      result : result[0]
    });
    next();
  }).catch((error) =>{
    res.status(400).json({
      message: `Couldn't retrieve latest Battle Results - ${error}`,
    });
  });
});

module.exports = router;