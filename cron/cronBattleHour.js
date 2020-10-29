const Avatar = require('../db').Avatar;
const Battle = require('../db').Battle;
const { Op } = require("sequelize");
//const db = require('../db').db;
const { sendBattleReportEmail, sendAppErrorEmail, sendBattleErrorEmail } = require('../mail');
const { cloneObj, parseAvatarProperties } = require('../helperFunctions');
const { generateFoeStats } = require('../game/foeFunctions');
const doScenarioAndBonus = require('../game/doScenarioAndBonus');
const { doAvatarBattlePrep, doFoeBattlePrep } = require('../game/doBattlePrep');
const { OUTCOME_XP, FOE_NON_ACTION, AVATAR_NON_ACTION } = require('../game/constants');
const doBattle = require('../game/doBattle');
const xpCalc = require('../game/upgrades/xpCalc');

console.log('*** RUNNING CRON AVATAR BATTLES ***');

let allBattleIds = [];
let allAvatarIds = [];
let allAvatarPromises = [];
let allFoes = [];
let allBattlePromises = [];
let avatarUpdates = [];
//let allUpdateAvatarPromises = [];

let tally= {
  foeWins : 0,
  avatarWins : 0,
  draw : 0,
  doubleKO : 0,
  total : 0,
  avWinPercent : 0,
  avWinPercentOverall : 0,
  tiePercent : 0
};

Battle.findAll({
  where: { outcome : 'TBD' },
  raw : true
}).then((battles) =>{

  battles.forEach((battle) =>{
    console.log('into arrays - ', battle.id, battle.avatarID, battle.foe);
    allBattleIds.push(battle.id);
    allAvatarIds.push(battle.avatarID);
    allFoes.push(battle.foe);
    
    allAvatarPromises.push(Avatar.findOne(
      { where : { id: battle.avatarID }, raw : true, attributes: ['name','character', 'qp', 'health','power','armor','fire','air','water','earth','status', 'activityXP', 'battleXP', 'battleWins','battleLosses','battleDraws', 'battleDkos'] }
    ));
  })

  return Promise.allSettled(allAvatarPromises);

}).then((avatars) =>{

  avatars.forEach((avatar, i) =>{
    avatar = avatar.value;
    // BATTLE STEP 1 - PLAYER DECIDES TO GO TO BATTLE (happends earlier when a user clicks 'Battle')

    // Non-Whole numbers come out of DB as strings, so need to convert to numbers here
    avatar = parseAvatarProperties(avatar);

    const itemsUsed = null;
    const actionsChosen = null;
    const generatedFoe = generateFoeStats(avatar);

    const foeWithStats = allFoes[i];

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
        // for email tally
        
        tally.avatarWins = tally.avatarWins + 1;

        break;
      case "Foe Wins":
        xpGain = OUTCOME_XP.loss;
        avatar.battleLosses = avatar.battleLosses + 1;
        // for email tally
        tally.foeWins = tally.foeWins + 1;

        break;
      case "Draw":
        xpGain = OUTCOME_XP.draw;
        avatar.battleDraws = avatar.battleDraws + 1;
        // for email tally
        tally.draw = tally.draw + 1;

        break;
      case "Double KO":
        xpGain = OUTCOME_XP.dko;
        avatar.battleDkos = avatar.battleDkos + 1;
        // for email tally
        tally.doubleKO = tally.doubleKO + 1;

        break;
      default:
    }

    // Check for lvl up
    const { checkLevelUp } = xpCalc(avatar.activityXP, avatar.battleXP);
    const { leveledUp, qpEarned } = checkLevelUp(xpGain);
    console.log('LEVELED UP - ', leveledUp, 'QP EARNED - ', qpEarned);


    allBattlePromises.push(Battle.update({
      scenario : scenario.id,
      outcome : b.outcomeData.outcome,
      aStatus : b.outcomeData.avatarStatus,
      aPhyDamage : b.aPhyDamage,
      fPhyReduction : b.fPhyReduction,
      fPhyDamage : b.fPhyDamage,
      aPhyReduction : b.aPhyReduction,
      xpGain,
      leveledUp : leveledUp,
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
    
    // Get QP earned from battle
    avatar.qp += qpEarned;
    
    avatarUpdates.push({ goToBattle : false, qp : avatar.qp, health : limitedAHealthRemaining, status : avatar.status, battleXP : avatar.battleXP, battleWins : avatar.battleWins, battleLosses : avatar.battleLosses, battleDraws :  avatar.battleDraws, battleDkos : avatar.battleDkos});
    // End Avatar for each
  });

  return Promise.all(allBattlePromises);
}).then(() => {

  
  const allUpdateAvatarPromises = [];
  allAvatarIds.forEach((avatarId, i) =>{
    allUpdateAvatarPromises.push(Avatar.update(avatarUpdates[i],{ where: { id: allAvatarIds[i] } }));
  });

  return Promise.allSettled(allUpdateAvatarPromises);
  
}).then((results) => {
  results.forEach((result) => console.log('All battle Promise Results - ', result.status))
  tally.total = tally.foeWins + tally.avatarWins + tally.draw + tally.doubleKO;
  tally.avWinPercent = Math.floor(tally.avatarWins / (tally.foeWins + tally.avatarWins)) || 0;
  tally.avWinPercentOverall = Math.floor(tally.avatarWins / tally.total) || 0;
  tally.tiePercent = Math.floor((tally.draw + tally.doubleKO) / tally.total) || 0;
  return new Promise((resolve, reject) =>{
    return sendBattleReportEmail(tally, resolve, reject);
  });
}).then(() =>{
  process.exit();
}).catch((error)=>{
  console.log('Error in BattleHour'. error);
  process.exit();
});