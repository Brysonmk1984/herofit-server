const express = require('express');
const router = express.Router(); 
const Avatar = require('../db').Avatar;
const db = require('../db').db;
const { Op } = require("sequelize");
const { sendAppErrorEmail } = require('../mail');
const { cloneObj } = require('../helperFunctions');
const { REGENERATION_RATE } = require('../game/constants');
const generateFoe = require('../game/generateFoe');
const determineScenerio = require('../game/determineScenerio');
const { doAvatarBattlePrep, doFoeBattlePrep } = require('../game/doBattlePrep');
const doBattle = require('../game/doBattle');


router.get('/regenerate-health', function(req, res, next){
  Avatar.findAll(
    { where: { health: { [Op.lt]: db.col('maxHealth') } }, raw: true },
  ).then((results) => {console.log(results);

    
    // Loop over each avatar and add up to 5 health
    results.forEach((result) =>{
      let h = result.health;
      const mH = result.maxHealth;

      if((h + REGENERATION_RATE) > mH){
        result.health = mH;
      }else{
        result.health += REGENERATION_RATE;
      }

      console.log(`updating Avatar health - ${result.name}`);
      Avatar.update(
        {health : result.health},
        { where: { owner: result.owner } }
      )
    });

    next();
  }).catch((error) =>{
    new Promise((resolve, reject) =>{
      sendAppErrorEmail({ message : error.message, status : error.status, debug : error.debug },resolve, reject)
    }).then(() =>{
      next();
    }).catch((error) =>{
      console.log('couldn\'t send error email for error - ', error);
      next();
    });

  });
});

router.post('/generate-foe', function(req, res, next){
  const foe = generateFoe(req.body.avatar);
  console.log(req.body.avatar);
  res.status(200).json({
    foe
  });

});

router.post('/do-battle', function(req, res, next){
  // BATTLE STEP 1 - PLAYER DECIDES TO GO TO BATTLE (happends earlier when a user clicks 'Battle')
  
  let avatar = JSON.parse(req.body.avatar);
  const itemsUsed = req.body.itemsUsed;
  const actionsChosen = req.body.actionsChosen;
  console.log(avatar);
  let foe = generateFoe(avatar);
 
  // // BATTLE STEP 2 - ENCOUNTER SCENARIO IS DECIDED
  const scenario = determineScenerio();

  function _calcScenarioBonuses(avatar, foe, scenario){
    const ap = avatar.power;
    const ah = avatar.health;
  
    const fp = foe.power;
    const fh = foe.health;
  
    avatar.power = ap + (ap * scenario.avatarPowerMod);
    avatar.health = ah + (ah * scenario.avatarHealthMod);
  
    foe.power = fp + (fp * scenario.foePowerMod);
    foe.health = fh + (fh * scenario.foeHealthMod);
  
    return { sAvatar : avatar, sFoe : foe };
  }

  const { sAvatar, sFoe } = _calcScenarioBonuses(cloneObj(avatar), cloneObj(foe), scenario);

  
  // // BATTLE STEP 3 - PLAYER USES ITEMS AND CHOOSED ACTIONS
  
  // avatar and foe to be used for battle
  let BRA = cloneObj(sAvatar, true);
  let BRF = cloneObj(sFoe, true);

  if(itemsUsed || actionsChosen){
    if(scenario.id !== 4){
      BRA = doAvatarBattlePrep(BRA, BRF, itemsUsed, actionsChosen);
    }
  }

  // // BATTLE STEP 4 - FOE USES ITEMS AND CHOOSED ACTIONS
  if(false){
    if(scenario.id !== 1){
      BRF = doFoeBattlePrep(BRA, BRF, itemsUsed, actionsChosen);
    }
  }


  // // BATTLE STEP 5 - EXCHANGE DAMAGE
  const battleResults = doBattle(BRA, BRF);

  // // BATTLE STEP 6 - END COMBAT, APPLY ANY POST BATTLE MECHANICS HERE
  res.status(200).json({
    avatar,
    //avatarPrep,
    BRA,
    BRF,
    //foePrep,
    scenario,
    battleResults
  });

});

module.exports = router;