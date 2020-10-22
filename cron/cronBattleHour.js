const Avatar = require('../db').Avatar;
const Battle = require('../db').Battle;
const { sendBattleReportEmail, sendAppErrorEmail, sendBattleErrorEmail } = require('../mail');
const { cloneObj, parseAvatarProperties } = require('../helperFunctions');
const { generateFoeStats } = require('../game/foeFunctions');
const { doAvatarBattlePrep, doFoeBattlePrep } = require('../game/doBattlePrep');
const doBattle = require('../game/doBattle');

console.log('*** RUNNING CRON AVATAR BATTLES ***');

let allBattleIds = [];
let allAvatarIds = [];
let allAvatarPromises = [];
let allFoes = [];

Battle.findAll({
  where: { outcome : 'Pending' },
  raw : true
}).then((battles) =>{

  battles.forEach((battle) =>{
    battles = battle[0];

    allBattleIds = battle.id;
    allAvatarIds.push(battle.avatarId);
    allFoes.push(battle.foe);

  })

  allAvatarPromises.push(Avatar.findAll(
    { where : { owner: { [Op.in]: allAvatarIds }, raw : true, attributes: ['name','character','health','power','armor','fire','air','water','earth','status', 'activityXP', 'battleXP', 'battleWins','battleLosses','battleDraws', 'battleDkos'] }}
  ));
  return Promise.all(allAvatarPromises);

}).then((avatars) =>{
  console.log('AVATARS', avatars);
}).catch((error)=>{
  console.log('error in cronBattleHour', error);
});









// .then((av)=>{
//   // BATTLE STEP 1 - PLAYER DECIDES TO GO TO BATTLE (happends earlier when a user clicks 'Battle')

//   // Non-Whole numbers come out of DB as strings, so need to convert to numbers here
//   avatar = parseAvatarProperties(av);
  
//   const itemsUsed = req.body.itemsUsed;
//   const actionsChosen = req.body.actionsChosen;

//   const foeWithStats = Object.assign({}, foe, generateFoeStats(avatar));

//   // BATTLE STEP 2 - ENCOUNTER SCENARIO IS DECIDED AND BONUSES GIVEN
//   const { scenario, sAvatar, sFoe  } = doScenarioAndBonus(cloneObj(avatar), cloneObj(foeWithStats));
  
//   // avatar and foe to be used for battle
//   let BRA = Object.assign({}, sAvatar);
//   let BRF = Object.assign({}, sFoe);
  
//   // BATTLE STEP 3 - PLAYER USES ITEMS AND CHOOSED ACTIONS
  
//   if(itemsUsed || actionsChosen){
//     if(scenario.id !== AVATAR_NON_ACTION){
//       const avBP = doAvatarBattlePrep(BRA, BRF, itemsUsed, actionsChosen);
//       BRA = avBP.avatar;
//       BRF = avBP.foe;
//     }
//   }

//   // BATTLE STEP 4 - FOE USES ITEMS AND CHOOSED ACTIONS
//   if(foeWithStats.ability){
//     if(scenario.id !== FOE_NON_ACTION){
//       const foeBP = doFoeBattlePrep(BRF, BRA, null, foeWithStats.ability);
//       BRF = foeBP.foe;
//       BRA = foeBP.avatar;
//     }
//   }

//   // BATTLE STEP 5 - EXCHANGE DAMAGE
//   const battleResults = doBattle(BRA, BRF);

//   // SAVE DATA

//   const b = battleResults;
//   let xpGain;

//   switch(b.outcomeData.outcome){
//     case "Avatar Wins":
//       xpGain = OUTCOME_XP.win;
//       avatar.battleWins = avatar.battleWins + 1;
//       break;
//     case "Foe Wins":
//       xpGain = OUTCOME_XP.loss;
//       avatar.battlelosses = avatar.battlelosses + 1;
//       break;
//     case "Draw":
//       xpGain = OUTCOME_XP.draw;
//       avatar.battleDraws = avatar.battleDraws + 1;
//       break;
//     case "Double KO":
//       xpGain = OUTCOME_XP.dko;
//       avatar.battleDkos = avatar.battleDkos + 1;
//       break;
//     default:
//   }

//   // SAVE RESULTS TO DB
//   return Battle.update({
//     scenario : scenario.id,
//     outcome : b.outcomeData.outcome,
//     aStatus : b.outcomeData.avatarStatus,
//     aPhyDamage : b.aPhyDamage,
//     fPhyReduction : b.fPhyReduction,
//     fPhyDamage : b.fPhyDamage,
//     aPhyReduction : b.aPhyReduction,
//     xpGain,
//     aHealthRemaining : b.aHealthRemaining,
//     fHealthRemaining : b.fHealthRemaining,
//     foe : Object.assign({}, foe, foeWithStats),
//     avatar : avatar,
//     bra : BRA,
//     brf : BRF,
//     aElmDamage : b.aElmDamage,
//     fElmReduction : b.fElmReduction,
//     fElmDamage : b.fElmDamage,
//     aElmReduction : b.aElmReduction,
//   },
//   { where: { id: battleID }, raw : true }
// ).then(() => {
//   const limitedAHealthRemaining = b.aHealthRemaining < 0 ? 0 : b.aHealthRemaining;

//   avatar.status = b.outcomeData.avatarStatus;
//   avatar.battleXP = avatar.battleXP + xpGain;

// }).then(() =>{
//   return Avatar.update(
//     { goToBattle : false, health : limitedAHealthRemaining, status : avatar.status, battleXP : avatar.battleXP, battleWins : avatar.battleWins, battleLosses : avatar.battleLosses, battleDraws :  avatar.battleDraws, battleDkos : avatar.battleDkos},
//     { where: { id: avatarID } })
//   })
// }).then((result) =>{
//   console.log('finished updating avatar', avatar);

// }).catch((error) =>{
//   console.log('ERROR SOMEWHERE IN BATTLE PROCESS - ', error);
// });
