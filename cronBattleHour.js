const Avatar = require('../db').Avatar;
const Battle = require('../db').Battle;
const { sendBattleReportEmail } = require('../mail');
const { cloneObj } = require('../helperFunctions');
const generateFoe = require('../game/generateFoe');
const { doAvatarBattlePrep, doFoeBattlePrep } = require('../game/doBattlePrep');
const doBattle = require('../game/doBattle');

console.log('*** RUNNING CRON AVATAR BATTLES ***');

battle.findAll(
  { raw: true },
).then((battles) => {
  console.log('BATTLES!', battles);
  const tally = {
    fw : 0,
    aw : 0,
    d : 0,
    dk : 0
  };

  // Loop over each avatar and run battle script
  battles.forEach((battle) =>{
    const battleId = battle.id;
    console.log('BID', battleId);
    console.log('AVDB INSTANCE RESULT - ', battle);
    
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
    const b = battleResults;
    // SAVE RESULTS TO DB
    Battle.update({
        outcome : b.outcome,
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