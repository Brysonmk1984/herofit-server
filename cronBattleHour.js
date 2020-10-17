const Avatar = require('../db').Avatar;
const Battle = require('../db').Battle;
const { sendBattleReportEmail } = require('../mail');
const { cloneObj } = require('../helperFunctions');
const generateFoe = require('../game/generateFoe');
const { doAvatarBattlePrep, doFoeBattlePrep } = require('../game/doBattlePrep');
const doBattle = require('../game/doBattle');

console.log('*** RUNNING CRON AVATAR BATTLES ***');

Avatar.findAll(
  { where: { goToBattle : true }, raw: true },
).then((results) => {

  const tally = {
    fw : 0,
    aw : 0,
    d : 0,
    dk : 0
  };

  // Loop over each avatar and run battle script
  results.forEach((result) =>{
    console.log('AVDB INSTANCE RESULT - ', result);
    
    // BATTLE STEP 1 - PLAYER DECIDES TO GO TO BATTLE (happends earlier when a user clicks 'Battle')  
    let avatar = result;
    const itemsUsed = req.body.itemsUsed || null;
    const actionsChosen = req.body.actionsChosen = null;;

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
    // SAVE RESULTS TO DB

    // Avatar.update(
    //   {health : result.health},
    //   { where: { owner: result.owner } }
    // )

  });


  // SEND ADMIN EMAIL FOR BATTLE TALLIES
  new Promise((resolve, reject) =>{
    sendBattleReportEmail({ tally },resolve, reject)
  }).then(() =>{
    next();
  }).catch((error) =>{
    console.log('couldn\'t send TALLITES email for error - ', error);
    next();
  });
}).catch((error) =>{
  new Promise((resolve, reject) =>{
    sendAppErrorEmail({ message : error.message, status : error.status, debug : error.debug },resolve, reject)
  }).catch((error) =>{
    console.log('couldn\'t send error email for error - ', error);
  });
});