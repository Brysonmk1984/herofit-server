const Avatar = require('../db').Avatar;
const Battle = require('../db').Battle;
const { sendBattleReportEmail, sendAppErrorEmail, sendBattleErrorEmail } = require('../mail');
const { cloneObj, parseAvatarProperties } = require('../helperFunctions');
const { generateFoeStats } = require('../game/foeFunctions');
const { doAvatarBattlePrep, doFoeBattlePrep } = require('../game/doBattlePrep');
const doBattle = require('../game/doBattle');

console.log('*** RUNNING CRON AVATAR BATTLES ***');

Battle.findAll(
  { where : { outcome : 'Pending' }, raw: true },
).then((battles) => {
  console.log('BATTLES!', battles);
  const tally = {
    fw : 0,
    aw : 0,
    d : 0,
    dk : 0
  };

  const errorTally = {
    retrievingAvatarForBattle : 0,
    savingIndividualBattleResult : 0,
    updatingAvatar : 0,
    errors : []
  };

  // Loop over each avatar and run battle script
  battles.forEach((battle) =>{
    const battleID = battle.id;
    console.log('THEBATTLE - ', battle);
    let foe = battle.foe;

    return Avatar.findOne(
      { where : { id : avatarID }, raw : true }
    ).then((avatar) =>{
        console.log('FOUND AVATAR!', avatar);
        // Non-Whole numbers come out of DB as strings, so need to convert to numbers here
        avatar = parseAvatarProperties(avatar);
        
        
        // BATTLE STEP 1 - PLAYER DECIDES TO GO TO BATTLE (happends earlier when a user clicks 'Battle')
        
        
        const itemsUsed = req.body.itemsUsed;
        const actionsChosen = req.body.actionsChosen;
        const foeWithStats = Object.assign({}, foe, generateFoeStats(avatar));
        console.log('generated foe - ', foeWithStats);
        // BATTLE STEP 2 - ENCOUNTER SCENARIO IS DECIDED AND BONUSES GIVEN
        const { scenario, sAvatar, sFoe  } = doScenarioAndBonus(cloneObj(avatar), cloneObj(foeWithStats, true));
        
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
        if(foeWithStats.ability){
          if(scenario.id !== 1){
            const foeBP = doFoeBattlePrep(BRF, BRA, null, foeWithStats.ability);
            BRF = foeBP.foe;
            BRA = foeBP.avatar;
          }
        }

        // BATTLE STEP 5 - EXCHANGE DAMAGE
        const battleResults = doBattle(BRA, BRF);
        
        
        
        // BATTLE STEP 6 - END COMBAT, APPLY ANY POST BATTLE MECHANICS HERE


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
          scenario : b.scenario.id,
          outcome : b.outcomeData.outcome,
          aStatus : b.outcomeData.avatarStatus,
          aPhyDamage : b.aPhyDamage,
          fPhyReduction : b.fPhyReduction,
          fPhyDamage : b.fPhyDamage,
          aPhyReduction : b.aPhyReduction,
          xpGain,
          aHealthRemaining : b.aHealthRemaining,
          fHealthRemaining : b.fHealthRemaining,
          foe : Object.assign({}, foe, foeWithStats),
          avatar : avatar,
          bra : BRA,
          brf : BRF,
          aElmDamage : b.aElmDamage,
          fElmReduction : b.fElmReduction,
          fElmDamage : b.fElmDamage,
          aElmReduction : b.aElmReduction,
        },
        { where: { id: battleID }, raw : true }
      ).then(() => {

        if(b.aHealthRemaining < 0){
          b.aHealthRemaining = 0;
        }

        avatar.status = b.outcomeData.avatarStatus;
        avatar.battleXP = avatar.battleXP + xpGain;

        return Avatar.update(
          { goToBattle : false, health : b.aHealthRemaining, status : avatar.status, battleXP : avatar.battleXP, battleWins : avatar.battleWins, battleLosses : avatar.battleLosses, battleDraws :  avatar.battleDraws, battleDkos : avatar.battleDkos},
          { where: { id: avatarID } }
          ).then((avatar) =>{
            console.log('finished updating avatar', avatar);
        }).catch((error) =>{
          console.log('ERROR UPDATING AV AFTER BATTLE - ', error);
          errorTally.updatingAvatar = errorTally.updatingAvatar + 1;
          errorTally.errors.push(error);
          next();
        });

      }).catch((error) =>{
        console.log('INDIVIDUAL BATTLE ERROR - ', error);
        errorTally.updatingAvatar = errorTally.savingIndividualBattleResult + 1;
        errorTally.errors.push(error);
        next();
      });

    }).catch((error) =>{
      console.log('ERROR RETRIEVING AVATAR FOR BATTLE - ', error);
      errorTally.updatingAvatar = errorTally.retrievingAvatarForBattle + 1;
      errorTally.errors.push(error);
      next();
    });
  });

  if(errorTally.errors.length){
    new Promise((resolve, reject) =>{
      return sendBattleErrorEmail({ message : 'ERRORS running Battle Hour', status : 500, errorTally },resolve, reject)
    }).catch((error) =>{
      console.log('couldn\'t send error email for error - ', error);
    });
  }

  // SEND ADMIN EMAIL FOR BATTLE TALLIES
  new Promise((resolve, reject) =>{
    return sendBattleReportEmail({ tally },resolve, reject)
  }).then(() =>{
    next();
  }).catch((error) =>{
    console.log('couldn\'t send TALLITES email for error - ', error);
    next();
  });


}).catch((error) =>{
  console.log('ERROR RETRIEVING BATTLES - ', error);
  new Promise((resolve, reject) =>{
    return sendAppErrorEmail({ message : error.message, status : error.status, debug : error.debug },resolve, reject)
  }).catch((error) =>{
    console.log('couldn\'t send error email for error - ', error);
  });
});
