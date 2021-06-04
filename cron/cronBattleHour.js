const { Avatar, Battle } = require('../config/db');
const { sendBattleReportEmail, sendCronErrorEmail } = require('../mail');
const { cloneObj, parseAvatarProperties, arrayChunker } = require('../lib/helperFunctions');
const doScenarioAndBonus = require('../game/doScenarioAndBonus');
const { doAvatarBattlePrep, doFoeBattlePrep } = require('../game/doBattlePrep');
const { OUTCOME_XP, FOE_NON_ACTION, AVATAR_NON_ACTION, BEGINNERS_LUCK_MAX_XP, BEGINNERS_LUCK_LIKELIHOOD } = require('../game/CONSTANTS');
const doBattle = require('../game/doBattle');
const xpCalc = require('../game/upgrades/xpCalc');
const avCalc = require('../game/upgrades/avCalc');
const { doAllPbas, doPostBattleEffects } = require('../game/runPostBattleActions');
const chance = require('chance')();

console.log('*** RUNNING CRON AVATAR BATTLES ***');
// Figure out which season it is, so a 25% bonus can be given to BRA & BRF
const { determineAstrologySeason } = avCalc();
const seasonalBonusElement = determineAstrologySeason(Date.now()).element.toLowerCase();

let allBattleIds = [];
let allAvatarIds = [];
let allAvatarPromises = [];
let allFoes = [];
let allPbaPromises = [];
let allBattlePromises = [];
let avatarUpdates = {};
// Breaking battles into groups of 20 so updating doesn't break
let battleShards = [];

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

function runBattlesOnBatch(shard, shardIndex){
  allBattleIds = [];
  allAvatarIds = [];
  allEffects = [];
  allFoes = [];
  // array of arrays
  allPbaArrays = [];
  allAvatarPromises = [];

  shard.forEach((battle) =>{
    //console.log('into arrays - ', battle.id, battle.avatarID, battle.foe);
    allBattleIds.push(battle.id);
    allAvatarIds.push(battle.avatarID);
    allEffects.push(battle.effects);
    allFoes.push(battle.foe);
    allPbaArrays.push(battle.postBattleActions);
    //console.log('BATTLE - ',battle);
    allAvatarPromises.push(Avatar.findOne(
      { where : { id: battle.avatarID }, raw : true, attributes: ['id','name','character', 'qp', 'health','power','armor','fire','air','water','earth','status', 'statusFade', 'activityXP', 'battleXP', 'battleWins','battleLosses','battleDraws', 'battleDkos', 'photonTokens'] }
    ));
  });


  return Promise.allSettled(allAvatarPromises)

  .then((results) =>{
    //results.forEach((result) => console.log('Find Avatar Promises', result.status));
    const avatars = results.map((result) => result.value);
    
    //console.log('AV LENGTH - ', avatars.length);
    //console.log('AVS - ', avatars);
    avatars.forEach((avatar, i) =>{
      // BATTLE STEP 1 - PLAYER DECIDES TO GO TO BATTLE (happens earlier when a user clicks 'Battle')

      // Non-Whole numbers come out of DB as strings, so need to convert to numbers here
      avatar = parseAvatarProperties(avatar);
      const foeWithStats  = allFoes[i];

      // Beginners luck Makes unfavorable scenarios and foe goesFirst less common for players below level 15
      let beginnersLuck = false;
      const avTXP = avatar.activityXP + avatar.battleXP;
      if(avTXP < BEGINNERS_LUCK_MAX_XP){
        beginnersLuck = chance.bool({ likelihood: BEGINNERS_LUCK_LIKELIHOOD});
      }

      // BATTLE STEP 2 - ENCOUNTER SCENARIO IS DECIDED AND BONUSES GIVEN
      let { scenario, sAvatar, sFoe  } = doScenarioAndBonus(cloneObj(avatar), cloneObj(foeWithStats), beginnersLuck);

      // BATTLE STEP 3 APPLY EFFECTS FROM ITEMS
      if(allEffects[i] && allEffects[i].length){
        const preBattleEffects = allEffects[i].filter(effect => effect.type === 'prebattle');
        // Buff or debuff hero and foe based on item effects
        // If new item effects are added, they need to be added in this function:
        const abp = doAvatarBattlePrep(sAvatar, sFoe, preBattleEffects, scenario.id);
        sAvatar = abp.avatar;
        sFoe = abp.foe;
      }

      // BATTLE STEP 4 - FOE USES prebattle ABILITY
      if(foeWithStats.ability && foeWithStats.ability.type === 'prebattle'){
        if(scenario.id !== FOE_NON_ACTION){
          const fbp = doFoeBattlePrep(sAvatar, sFoe, foeWithStats.ability);
          sAvatar = fbp.avatar;
          sFoe = fbp.foe;
        }
      }

      // Element by Seasonal Element Bonus
      sAvatar[seasonalBonusElement] *= 1.25;
      sFoe[seasonalBonusElement] *= 1.25;

      const BRA = sAvatar;
      const BRF = sFoe;

      // WHO SWINGS FIRST
      let goesFirst;
      if(scenario.id === 0){
        goesFirst = 'Avatar';
      }else if(scenario.id === 3){
        goesFirst = 'Foe';
      }else{
        // 75% Chance the Avatar will go first if below level 15
        if(beginnersLuck){
          goesFirst = 'Avatar';
        }else{
          const randDecider = Math.floor(Math.random() * 2);
          goesFirst = randDecider === 0 ? 'Avatar' : 'Foe';
        }
      }

      // BATTLE STEP 5 - EXCHANGE DAMAGE
      const b = doBattle(BRA, BRF, goesFirst);

      // SAVE DATA
      let xpGain, ptGain = 0;
      
      // POST BATTLE ACTIONS
      const postBattleActions = allPbaArrays[i] || [];

      switch(b.outcomeData.outcome){
        case "Avatar Wins":
          xpGain = BRF.xpBounty; 
          ptGain = BRF.ptBounty; 
          avatar.battleWins = avatar.battleWins + 1;
          //console.log('XP-bounty', xpGain);
          //console.log('PT-bounty', ptGain);
          //console.log('pbas after win before insertion - cron - ',postBattleActions);
          avatar.photonTokens += ptGain;
          if(postBattleActions){
            allPbaPromises.push(doAllPbas(avatar.id, postBattleActions, b.outcomeData.outcome));
          }

          // for email tally
          tally.avatarWins += 1;
          break;
        case "Foe Wins":
          xpGain = BRF.xpBounty * OUTCOME_XP.lossMultiplier;
          avatar.battleLosses = avatar.battleLosses + 1;
          // for email tally
          tally.foeWins += 1;
          break;
        case "Draw":
          xpGain = BRF.xpBounty * OUTCOME_XP.drawMultiplier;
          avatar.battleDraws = avatar.battleDraws + 1; 
          // for email tally
          tally.draw += 1;
          break;
        case "Double KO":
          xpGain = BRF.xpBounty * OUTCOME_XP.dkoMultiplier;
          avatar.battleDkos = avatar.battleDkos + 1;
          if(postBattleActions){
            allPbaPromises.push(doAllPbas(avatar.id, postBattleActions, b.outcomeData.outcome));
          }
          // for email tally
          tally.doubleKO += 1;
          break;
        default:
      }
      
      // Check for lvl up
      const { checkLevelUp } = xpCalc(avatar.activityXP, avatar.battleXP);
      const { leveledUp, qpEarned } = checkLevelUp(xpGain);
      //console.log('LEVELED UP - ', leveledUp, 'QP EARNED - ', qpEarned);

      allBattlePromises.push(Battle.update({
        scenario : scenario.id,
        outcome : b.outcomeData.outcome,
        aStatus : b.outcomeData.avatarStatus,
        aPhyDamage : b.aPhyDamage,
        fPhyReduction : b.fPhyReduction,
        fPhyDamage : b.fPhyDamage,
        aPhyReduction : b.aPhyReduction,
        xpGain,
        ptGain,
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
        roundBreakdown : b.roundBreakdown
      },
      { where: { id: allBattleIds[i] }, raw : true }
      ));

      const limitedAHealthRemaining = b.aHealthRemaining < 0 ? 0 : b.aHealthRemaining;
      avatar.status = b.outcomeData.avatarStatus;
      avatar.battleXP += xpGain;
      avatar.qp += qpEarned;

      // If Any postbattle abilities exist, use them
      avatar = doPostBattleEffects(avatar, foeWithStats, b.outcomeData.outcome);
      console.log('AVATAR CHECK - ', avatar);
      avatarUpdates[avatar.id] = { goToBattle : false, qp : avatar.qp, health : limitedAHealthRemaining, status : avatar.status, statusFade : avatar.statusFade, battleXP : avatar.battleXP, battleWins : avatar.battleWins, battleLosses : avatar.battleLosses, battleDraws :  avatar.battleDraws, battleDkos : avatar.battleDkos, photonTokens : avatar.photonTokens };
      
      // End Avatar for each
    });

    return Promise.allSettled([...allBattlePromises, ...allPbaPromises]);
  }).then((data) => {
    //data.forEach((result) => console.log('Battle & PBS Promises:', result.status));
    console.log(`SHARD ${shardIndex} - UPDATED ALL BATTLES AND RAN ALL PBAS - cron`, data);
    
    const allUpdateAvatarPromises = [];
    allAvatarIds.forEach((avatarId, i) =>{
      allUpdateAvatarPromises.push(Avatar.update(avatarUpdates[avatarId],{ where: { id: avatarId } }));
    });

    return Promise.allSettled(allUpdateAvatarPromises);
  }).then((results) =>{
    //results.forEach((result) => console.log('AvatarUpdate Promises', result.status));
  }).catch((error) =>{
    console.log(`SHARD ${shardIndex} - BATTLE ERROR - `, error);
  });
}


Battle.findAll({
  where: { outcome : 'TBD' },
  raw : true
}).then((battles) =>{
  console.log('BATTLECOUNT - ', battles.length);
  // Need to divide records into groups of 7
  battleShards = arrayChunker(battles, 6);
  console.log('BattleShard length = ', battleShards.length);
  
  return Promise.allSettled(battleShards.map(async (shard, i) => {
    //console.log('I - ', i);
    // Update one batch every 6 seconds
    const timeoutDuration = i * 6000;

    return await new Promise((resolve) =>{
      setTimeout(() => {
        resolve(runBattlesOnBatch(shard, i));
      }, timeoutDuration);
    });
  }));

}).then((results) => {
  //results.forEach((result) => console.log('All battle Promise Results - ', result.status))
  tally.total = tally.foeWins + tally.avatarWins + tally.draw + tally.doubleKO;
  tally.avWinPercent = Math.floor(tally.avatarWins / (tally.foeWins + tally.avatarWins)) || 0;
  tally.avWinPercentOverall = Math.floor(tally.avatarWins / tally.total) || 0;
  tally.tiePercent = Math.floor((tally.draw + tally.doubleKO) / tally.total) || 0;
  console.log('tally', tally);
  if(tally.total){
    return new Promise((resolve, reject) =>{
      return sendBattleReportEmail(tally, resolve, reject);
    });
  }else{
    resolve()
  }
}).then(() =>{
  process.exit();
}).catch((error)=>{
  new Promise((resolve, reject) =>{
    return sendCronErrorEmail({ message : error.message, status : error.status, debug : error.debug, errorLocation : "Cron Script" },resolve, reject)
  }).catch((error) =>{
    console.log('couldn\'t send error email for REVIVE AVATARS - ', error);
    process.exit();
  });
});