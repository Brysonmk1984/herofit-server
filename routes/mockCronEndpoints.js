const express = require('express');
const router = express.Router(); 
const Avatar = require('../db').Avatar;
const Battle = require('../db').Battle;
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



// DO A SINGLE INSTANCE OF BATTLE with passed in Avatar
router.post('/do-battle-mock', function(req, res, next){
  // BATTLE STEP 1 - PLAYER DECIDES TO GO TO BATTLE (happends earlier when a user clicks 'Battle')
  let avatar = req.body.avatar;
 
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
  const b = battleResults;
  let xpGain;

  switch(battleResults.outcomeData.outcome){
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
  
  // SAVE RESULTS TO DB
  Battle.update({
    outcome : b.outcomeData.outcome,
    aStatus : b.avatarStatus,
    aPhyDamage : b.aPhyDamage,
    fPhyReduction : b.fPhyReduction,
    fPhyDamage : b.fPhyDamage,
    aPhyReduction : b.aPhyReduction,
    xpGain,
    aHealthRemaining : b.aHealthRemaining,
    fHealthRemaining : b.fHealthRemaining,
    foe,
    bra : BRA,
    brf : BRF,
    aElmDamage : b.aElmDamage,
    fElmReduction : b.fElmReduction,
    fElmDamage : b.fElmDamage,
    aElmReduction : b.aElmReduction,
  },
  { where: { id: battleId } }
).then((battles) => {
  // Avatar.update(
  //   {health : result.health},
  //   { where: { owner: result.owner } }
  // )
}).catch((error) =>{
  console.log('INDIVIDUAL BATTLE ERROR - ', error);
});

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
  for(let i=0;i<100;i++){
    // BATTLE STEP 1 - PLAYER DECIDES TO GO TO BATTLE (happends earlier when a user clicks 'Battle')
    
    let avatar = req.body.avatar;
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

      if(battleResults.outcomeData.outcome === "Foe Wins"){
        tally[SCENARIO.id].fw++;
      }else if(battleResults.outcomeData.outcome === "Avatar Wins"){
        tally[SCENARIO.id].aw++;
      }else if(battleResults.outcomeData.outcome === "Draw"){
        tally[SCENARIO.id].d++;
      }else if(battleResults.outcomeData.outcome === "Double KO"){
        tally[SCENARIO.id].dk++;
      }

    const awins = tally[SCENARIO.id].aw;
    const fwins = tally[SCENARIO.id].fw;
    const aAndfwins = tally[SCENARIO.id].aw + tally[SCENARIO.id].fw;
    const all = tally[SCENARIO.id].aw + tally[SCENARIO.id].fw + tally[SCENARIO.id].d + tally[SCENARIO.id].dk;
    const aAverage = awins / aAndfwins || 0;
    const aAverageOverall = awins / all || 0;
    const fAverage = fwins / aAndfwins || 0;
    const fAverageOverall = fwins / all || 0;
    const dAverage = tally[SCENARIO.id].d / all || 0;
    const dKAverage = tally[SCENARIO.id].dk / all || 0;

      tally[SCENARIO.id].averages = {
        'AVATAR WINS VS FOE' : (parseFloat(aAverage) * 100).toFixed(1) +`%`,
        'AVATAR WINS OVERALL' : (parseFloat(aAverageOverall) * 100).toFixed(1) +`%`,
        'FOE WINS VS AVATAR' : (parseFloat(fAverage) * 100).toFixed(1) +`%`,
        'FOE WINS OVERALL' : (parseFloat(fAverageOverall) * 100).toFixed(1) +`%`,
        'DRAW' : (parseFloat(dAverage) * 100).toFixed(1) +`%`,
        'DOUBLE KO' : (parseFloat(dKAverage) * 100).toFixed(1) +`%`,
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


// DO A SINGLE INSTANCE OF BATTLE with passed in Avatar
router.post('/do-battle', function(req, res, next){
  const avatarID = req.body.avatarID;

  Battle.findOne(
    { where : { avatarID }, raw : true}
  ).then((battle) =>{
    const battleID = battle.id;
    console.log('THEBATTLE - ', battle);

    return Avatar.findOne(
      { where : { id : avatarID }, raw : true }
    ).then((avatar) =>{
        // BATTLE STEP 1 - PLAYER DECIDES TO GO TO BATTLE (happends earlier when a user clicks 'Battle')
        console.log('FOUND AVATAR!', avatar);
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

        // SAVE DATA

        const b = battleResults;
        let xpGain;

        switch(b.outcomeData.outcome){
          case "Avatar Wins":
            xpGain = OUTCOME_XP.win;
            avatar.battleWins = avatar.battleWins + 1;
            break;
          case "Foe Wins":
            xpGain = OUTCOME_XP.loss;
            avatar.battlelosses = avatar.battlelosses + 1;
            break;
          case "Draw":
            xpGain = OUTCOME_XP.draw;
            avatar.battleDraws = avatar.battleDraws + 1;
            break;
          case "Double KO":
            xpGain = OUTCOME_XP.dko;
            avatar.battleDkos = avatar.battleDkos + 1;
            break;
          default:
        }

        // SAVE RESULTS TO DB
        return Battle.update({
          scenario : scenario.id,
          outcome : b.outcomeData.outcome,
          aStatus : b.outcomeData.avatarStatus,
          aPhyDamage : b.aPhyDamage,
          fPhyReduction : b.fPhyReduction,
          fPhyDamage : b.fPhyDamage,
          aPhyReduction : b.aPhyReduction,
          xpGain,
          aHealthRemaining : b.aHealthRemaining,
          fHealthRemaining : b.fHealthRemaining,
          foe,
          bra : BRA,
          brf : BRF,
          aElmDamage : b.aElmDamage,
          fElmReduction : b.fElmReduction,
          fElmDamage : b.fElmDamage,
          aElmReduction : b.aElmReduction,
        },
        { where: { id: battleID }, raw : true }
      ).then(() => {

        if(battle.aHealthRemaining < 0){
          b.aHealthRemaining = 0;
        }

        avatar.status = b.outcomeData.avatarStatus;
        avatar.battleXP = avatar.battleXP + xpGain;

        return Avatar.update(
          { goToBattle : false, health : b.aHealthRemaining, status : avatar.status, battleXP : avatar.battleXP, battleWins : avatar.battleWins, battleLosses : avatar.battleLosses, battleDraws :  avatar.battleDraws, battleDkos : avatar.battleDkos},
          { where: { id: avatarID } }
          ).then((avatar) =>{
            console.log('finished updating avatar', avatar);
            
            // BATTLE STEP 6 - END COMBAT, APPLY ANY POST BATTLE MECHANICS HERE
            res.status(200).json({
              avatar,
              BRA,
              BRF,
              scenario,
              battleResults,
              xpGain
            });

        }).catch((error) =>{
          console.log('ERROR UPDATING AV AFTER BATTLE - ', error);
          res.status(400).json({
            message: `ERROR UPDATING AV AFTER BATTLE`,
            debug : err
          });
          next();
        });

      }).catch((error) =>{
        console.log('INDIVIDUAL BATTLE ERROR - ', error);
        res.status(400).json({
          message: `INDIVIDUAL BATTLE ERROR`,
          debug : err
        });
        next();
      });

    }).catch((error) =>{
      console.log('ERROR RETRIEVING AVATAR FOR BATTLE - ', error);
      res.status(400).json({
        message: `ERROR RETRIEVING AVATAR FOR BATTLE`,
        debug : err
      });
      next();
    });
  }).catch((error) =>{
    console.log('ERROR RETRIEVING BATTLE - ', error);
    res.status(400).json({
      message: `ERROR RETRIEVING BATTLE`,
      debug : err
    });
    next();
  });
  
});