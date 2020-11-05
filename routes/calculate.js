const express = require('express');
const router = express.Router(); 
const avCalc = require('../game/upgrades/avCalc');
const xpCalc = require('../game/upgrades/xpCalc');


router.post('/fetch-astrology-season' , function(req, res, next){

  const { determineAstrologySeason } = avCalc();
  const { sign, element } = determineAstrologySeason(req.body.date);

  if(sign && element){
    res.status(200).json({
      sign,
      element
    });
  }else{
    res.status(400);
  }
  next();
});

router.post('/fetch-current-level-by-input' , function(req, res, next){
  
  const xp = req.body.xp;
  const { currentLevelByInput } = xpCalc();
  const currentLevel = currentLevelByInput(xp);

  if(currentLevel){
    res.status(200).json({
      currentLevel
    });
  }else{
    res.status(400);
  }
  next();
});

router.post('/fetch-next-level-xp-by-input' , function(req, res, next){

  const level = req.body.level;
  const { nextLevelByInput } = xpCalc();
  const nextLevelXp = nextLevelByInput(level);
  
  if(nextLevelXp){
    res.status(200).json({
      nextLevelXp
    });
  }else{
    res.status(400);
  }
  next();
});

router.post('/check-level-up-by-input' , function(req, res, next){
  const startingXP = req.body.startingXP;
  const endingXP = req.body.endingXP;
  const { checkLevelUpByInput } = xpCalc();
  const { leveledUp, levels } = checkLevelUpByInput(startingXP, endingXP);
  res.status(200).json({
    leveledUp,
    levels
  });

  next();
});


module.exports = router;