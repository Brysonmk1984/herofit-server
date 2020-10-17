const express = require('express');
const router = express.Router(); 
const Avatar = require('../db').Avatar;
const db = require('../db').db;
const { Op } = require("sequelize");
const { sendAppErrorEmail } = require('../mail');
const { cloneObj } = require('../helperFunctions');
const { REGENERATION_RATE, BATTLE_SCENARIOS, OUTCOME_XP } = require('../game/constants');
const generateFoe = require('../game/generateFoe');
const doScenarioAndBonus = require('../game/doScenarioAndBonus');
const { doAvatarBattlePrep, doFoeBattlePrep } = require('../game/doBattlePrep');
const doBattle = require('../game/doBattle');

// FORCE A CYCLE OF HEALTH REGEN FOR ALL ALLIES
router.get('/regenerate-health', function(req, res, next){
  Avatar.findAll(
    { where: { health: { [Op.lt]: db.col('maxHealth') } }, raw: true },
  ).then((results) => {

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

// RANDOMLY GENERATE A FOE
router.post('/generate-foe', function(req, res, next){
  const foe = generateFoe(req.body.avatar);
  res.status(200).json({
    foe
  });
});

// DO A SINGLE INSTANCE OF BATTLE
router.post('/do-battle', function(req, res, next){
  
  // BATTLE STEP 1 - PLAYER DECIDES TO GO TO BATTLE (happends earlier when a user clicks 'Battle')
  let avatar = JSON.parse(req.body.avatar);
  const itemsUsed = req.body.itemsUsed;
  const actionsChosen = req.body.actionsChosen;
  let foe = generateFoe(avatar);

  // BATTLE STEP 2 - ENCOUNTER SCENARIO IS DECIDED AND BONUSES GIVEN
  const { scenario, sAvatar, sFoe  } = doScenarioAndBonus(cloneObj(avatar), cloneObj(foe));
  
  // avatar and foe to be used for battle
  let BRA = Object.assign({}, sAvatar);
  let BRF = Object.assign({}, sFoe);

  // BATTLE STEP 3 - PLAYER USES ITEMS AND CHOOSED ACTIONS
  
  if(itemsUsed || actionsChosen){
    if(scenario.id !== 4){
      BRA = doAvatarBattlePrep(BRA, BRF, itemsUsed, actionsChosen);
    }
  }

  // BATTLE STEP 4 - FOE USES ITEMS AND CHOOSED ACTIONS
  if(false){
    if(scenario.id !== 1){
      BRF = doFoeBattlePrep(BRA, BRF, itemsUsed, actionsChosen);
    }
  }

  // BATTLE STEP 5 - EXCHANGE DAMAGE
  const battleResults = doBattle(BRA, BRF);
  let xpGain;

  switch(battleResults.outcome.outcome){
    case "Avatar Wins":
      xpGain = OUTCOME_XP.win;
      break;
    case "Foe Wins":
      xpGain = OUTCOME_XP.loss;
      break;
    case "Draw":
      xpGain = OUTCOME_XP.draw;
      break;
    case "Double KO":
      xpGain = OUTCOME_XP.dko;
      break;
    default:
  }

  // BATTLE STEP 6 - END COMBAT, APPLY ANY POST BATTLE MECHANICS HERE
  res.status(200).json({
    avatar,
    //avatarPrep,
    BRA,
    BRF,
    //foePrep,
    scenario,
    battleResults,
    xpGain
  });

});

// SIMULATE 100 BATTLES FOR EACH OF THE 6 SCENARIOS
router.post('/do-battle-sims', function(req, res, next){
  // overall Tally of results
  const tally = {};

  // FOR EACH OF THE 6 SCENARIOS, DO 100 BATTLES
  BATTLE_SCENARIOS.forEach((SCENARIO) =>{
    
  tally[SCENARIO.id] = {
    fw : 0,
    aw : 0,
    d : 0,
    dk : 0
  };

  // SIMULATING 100 BATTLES
  for(let i=0;i<99;i++){
    // BATTLE STEP 1 - PLAYER DECIDES TO GO TO BATTLE (happends earlier when a user clicks 'Battle')
    
    let avatar = JSON.parse(req.body.avatar);
    const itemsUsed = req.body.itemsUsed;
    const actionsChosen = req.body.actionsChosen;
    let foe = generateFoe(avatar);
  
    // // BATTLE STEP 2 - ENCOUNTER SCENARIO IS DECIDED AND BONUSES GIVEN
    const { scenario, sAvatar, sFoe  } = doScenarioAndBonus(cloneObj(avatar), cloneObj(foe), SCENARIO.id);

    // avatar and foe to be used for battle
    let BRA = Object.assign({}, sAvatar);
    let BRF = Object.assign({}, sFoe);

    // BATTLE STEP 3 - PLAYER USES ITEMS AND CHOOSED ACTIONS
    if(itemsUsed || actionsChosen){
      if(scenario.id !== 4){
        BRA = doAvatarBattlePrep(BRA, BRF, itemsUsed, actionsChosen);
      }
    }

    // BATTLE STEP 4 - FOE USES ITEMS AND CHOOSED ACTIONS
    if(false){
      if(scenario.id !== 1){
        BRF = doFoeBattlePrep(BRA, BRF, itemsUsed, actionsChosen);
      }
    }

    // BATTLE STEP 5 - EXCHANGE DAMAGE
    const battleResults = doBattle(BRA, BRF);

      if(battleResults.outcome.outcome === "Foe Wins"){
        tally[SCENARIO.id].fw++;
      }else if(battleResults.outcome.outcome === "Avatar Wins"){
        tally[SCENARIO.id].aw++;
      }else if(battleResults.outcome.outcome === "Draw"){
        tally[SCENARIO.id].d++;
      }else if(battleResults.outcome.outcome === "Double KO"){
        tally[SCENARIO.id].dk++;
      }
      tally[SCENARIO.id].averages = {
        'AVATAR WINS VS FOE' : (parseFloat(tally[SCENARIO.id].aw / (tally[SCENARIO.id].aw + tally[SCENARIO.id].fw)) * 100).toFixed(1) +`%`,
        'AVATAR WINS OVERALL' : (parseFloat(tally[SCENARIO.id].aw / (tally[SCENARIO.id].aw + tally[SCENARIO.id].fw + tally[SCENARIO.id].d + tally[SCENARIO.id].dk)) * 100).toFixed(1) +`%`,
        'FOE WINS VS AVATAR' : (parseFloat(tally[SCENARIO.id].fw / (tally[SCENARIO.id].aw + tally[SCENARIO.id].fw)) * 100).toFixed(1) +`%`,
        'FOE WINS OVERALL' : (parseFloat(tally[SCENARIO.id].fw / (tally[SCENARIO.id].aw + tally[SCENARIO.id].fw + tally[SCENARIO.id].d + tally[SCENARIO.id].dk)) * 100).toFixed(1) +`%`,
        'DRAW' : (parseFloat(tally[SCENARIO.id].d / (tally[SCENARIO.id].aw + tally[SCENARIO.id].fw + tally[SCENARIO.id].d + tally[SCENARIO.id].dk)) * 100).toFixed(1) +`%`,
        'DOUBLE KO' : (parseFloat(tally[SCENARIO.id].dk / (tally[SCENARIO.id].aw + tally[SCENARIO.id].fw + tally[SCENARIO.id].d + tally[SCENARIO.id].dk)) * 100).toFixed(1) +`%`,
      }
      tally[SCENARIO.id].scenario = scenario;
  }
  });

  // BATTLE STEP 6 - END COMBAT, APPLY ANY POST BATTLE MECHANICS HERE
  res.status(200).json({
    tally
  });
});
module.exports = router;