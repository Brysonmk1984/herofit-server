const Avatar = require('../db').Avatar;
const Battle = require('../db').Battle;
const { Op } = require("sequelize");
const { sendBattleReportEmail, sendAppErrorEmail, sendBattleErrorEmail } = require('../mail');
const { cloneObj, parseAvatarProperties } = require('../helperFunctions');
const { generateFoeStats } = require('../game/foeFunctions');
const { doAvatarBattlePrep, doFoeBattlePrep } = require('../game/doBattlePrep');
const doBattle = require('../game/doBattle');
const { sendAppErrorEmail} = require('../mail');


console.log('*** RUNNING CRON AVATAR BATTLES ***');

let allBattleIds = [];
let allAvatarIds = [];
let allAvatarPromises = [];
let allFoes = [];
let allBattlePromises = [];
let avatarUpdates = [];
//let allUpdateAvatarPromises = [];


Battle.findAll({
  where: { outcome : 'TBD' },
  raw : true
}).then((battles) =>{

  battles.forEach((battle) =>{
    battles = battle[0];
    allBattleIds.push(battle.id);
    allAvatarIds.push(battle.avatarID);
    allFoes.push(battle.foe);
    
    allAvatarPromises.push(Avatar.findOne(
      { where : { id: { [Op.in]: allAvatarIds }}, raw : true, attributes: ['name','character','health','power','armor','fire','air','water','earth','status', 'activityXP', 'battleXP', 'battleWins','battleLosses','battleDraws', 'battleDkos'] }
    ));
  })

  return Promise.allSettled(allAvatarPromises);

}).then((avatars) =>{

  avatars.forEach((avatar, i) =>{
    // BATTLE STEP 1 - PLAYER DECIDES TO GO TO BATTLE (happends earlier when a user clicks 'Battle')

    // Non-Whole numbers come out of DB as strings, so need to convert to numbers here
    avatar = parseAvatarProperties(avatar);

    const itemsUsed = req.body.itemsUsed || null;
    const actionsChosen = req.body.actionsChosen || null;

    const foeWithStats = Object.assign({}, allFoes[i], generateFoeStats(avatar));

    // BATTLE STEP 2 - ENCOUNTER SCENARIO IS DECIDED AND BONUSES GIVEN
    const { scenario, sAvatar, sFoe  } = doScenarioAndBonus(cloneObj(avatar), cloneObj(foeWithStats));
    
    // avatar and foe to be used for battle
    let BRA = Object.assign({}, sAvatar);
    let BRF = Object.assign({}, sFoe);
    
    // BATTLE STEP 3 - PLAYER USES ITEMS AND CHOOSED ACTIONS
    
    if(itemsUsed || actionsChosen){
      if(scenario.id !== AVATAR_NON_ACTION){
        const avBP = doAvatarBattlePrep(BRA, BRF, itemsUsed, actionsChosen);
        BRA = avBP.avatar;
        BRF = avBP.foe;
      }
    }

    // BATTLE STEP 4 - FOE USES ITEMS AND CHOOSED ACTIONS
    if(foeWithStats.ability){
      if(scenario.id !== FOE_NON_ACTION){
        const foeBP = doFoeBattlePrep(BRF, BRA, null, foeWithStats.ability);
        BRF = foeBP.foe;
        BRA = foeBP.avatar;
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
        avatar.battleLosses = avatar.battleLosses + 1;
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

    allBattlePromises.push(Battle.update({
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
      foe : Object.assign({}, allFoes[i], foeWithStats),
      avatar : avatar,
      bra : BRA,
      brf : BRF,
      aElmDamage : b.aElmDamage,
      fElmReduction : b.fElmReduction,
      fElmDamage : b.fElmDamage,
      aElmReduction : b.aElmReduction,
    },
    { where: { id: allBattleIds[i] }, raw : true }
    ));
    const limitedAHealthRemaining = b.aHealthRemaining < 0 ? 0 : b.aHealthRemaining;
    avatar.status = b.outcomeData.avatarStatus;
    avatar.battleXP = avatar.battleXP + xpGain;

    avatarUpdates.push({ goToBattle : false, health : limitedAHealthRemaining, status : avatar.status, battleXP : avatar.battleXP, battleWins : avatar.battleWins, battleLosses : avatar.battleLosses, battleDraws :  avatar.battleDraws, battleDkos : avatar.battleDkos});
    // End Avatar for each
  });

  return Promise.all(allBattlePromises);
}).then(() => {
  console.log('UPDATED ALL BATTLES');
  
  const allUpdateAvatarPromises = [];
  allAvatarIds.forEach((avatarId, i) =>{
    allUpdateAvatarPromises.push(Avatar.update(avatarUpdates[i],{ where: { id: allAvatarIds[i] } }));
  });

  return Promise.allSettled(allUpdateAvatarPromises);
  
}).then((results) => {
  console.log('Ending Promise Results',results.length);
  return results.forEach((result) => console.log('All battle Promise Results - ', result.status))
}).catch((error)=>{
  console.log('error in cronBattleHour', error);
});
