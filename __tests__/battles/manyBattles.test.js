const avatarProfiles = require('./heroProfiles.json');
const avatarPowerSpecProfiles = require('./powerProfiles.json');
const { selectFoeTemplate, generateFoeStats } = require('../../game/foeFunctions');
const { calcScenarioBonuses, determineScenario } = require('../../game/battle/scenario');
const { doAvatarBattlePrep, doFoeBattlePrep } = require("../../game/battle/doBattlePrep");
const doBattle = require('../../game/battle/doBattle');
const { FOE_NON_ACTION, BEGINNERS_LUCK_MAX_XP, BEGINNERS_LUCK_LIKELIHOOD } = require('../../game/CONSTANTS');
const avCalc = require('../../game/upgrades/avCalc');
const xpCalc = require('../../game/upgrades/xpCalc');
const chance = require('chance')();


// Use toEqual for objects and arrays
// Use toBe for scalar (primitive) data types only. 
// check the response data type use typeof operator
const generateFoes = function(avatars){
  return avatars.map((av) =>{
   const foeTemplate = selectFoeTemplate(av.level);

    const foe = {
      id : foeTemplate.id,
      type : foeTemplate.type,
      name : foeTemplate.foe[Math.floor(Math.random() * foeTemplate.foe.length)],
      ability : foeTemplate.ability,
      class : foeTemplate.class
    }
    return Object.assign({}, foe, generateFoeStats(av, foe));
  });
};



function generateBrs(avatars, foesWithStats){
  const { determineAstrologySeason } = avCalc();
  const seasonalBonusElement = determineAstrologySeason(Date.now()).element.toLowerCase();
  return avatars.map((av, i) =>{
    let BRA;
    let BRF;
    let goesFirst;

    // Beginners luck Makes unfavorable scenarios and foe goesFirst less common for players below level 15
    let beginnersLuck = false;
    const avTXP = av.activityXP + av.battleXP;
    if(avTXP < BEGINNERS_LUCK_MAX_XP){
      beginnersLuck = chance.bool({ likelihood: BEGINNERS_LUCK_LIKELIHOOD});
    }

    // BATTLE STEP 2 - ENCOUNTER SCENARIO IS DECIDED AND BONUSES GIVEN
    scenario = determineScenario(beginnersLuck);
    const scenarioBonuses = calcScenarioBonuses(av, foesWithStats[i], scenario);
    const sAvatar = scenarioBonuses.sAvatar;
    const sFoe = scenarioBonuses.sFoe;

    // avatar and foe to be used for battle
    BRA = Object.assign({}, sAvatar);
    BRF = Object.assign({}, sFoe);

    // Element by Seasonal Element Bonus
    BRA[seasonalBonusElement] = BRA[seasonalBonusElement] * 1.25;
    BRF[seasonalBonusElement] = BRF[seasonalBonusElement] * 1.25;

    // BATTLE STEP 3 - NOT IN GAME YET

    // BATTLE STEP 4 - FOE USES prebattle ABILITY
    if(foesWithStats[i].ability && foesWithStats[i].ability.type === 'prebattle'){
      if(scenario.id !== FOE_NON_ACTION){
        const foeBP = doFoeBattlePrep(BRA, BRF, foesWithStats[i].ability);
        BRF = foeBP.foe;
        BRA = foeBP.avatar;
      }
    }

    // WHO SWINGS FIRST
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
    return { BRA, BRF, goesFirst }

  });

}



describe('Battle all generated foes against av profiles', ()=>{

  let avatars = avatarProfiles.map((av) => {
    const { getCurrentLevel } = xpCalc(av.activityXP, av.battleXP);
    return Object.assign({}, av, { level : getCurrentLevel().total });
  });
  let multipliedAvatars = [];
  // Multiplies the instances of avatar profiles to create more battles
  const battleMultiplier = 5;
  for(let i = 0; i < battleMultiplier; i++){
    multipliedAvatars.push(...avatars);
  }

  console.log('MULT AV - ', multipliedAvatars.length);

  let foesWithStats = generateFoes(multipliedAvatars);
  let preBattles =  generateBrs(multipliedAvatars, foesWithStats);




  // BATTLE STEP 5 - EXCHANGE DAMAGE


  const allBattles = preBattles.map((b) =>{
    return Object.assign({}, doBattle(b.BRA, b.BRF, b.goesFirst), { foeType :  b.BRF.type, foeClass : b.BRF.class });
  });

  //console.log('FIRST BATTLE - ', allBattles[0]);

  const totals = {
    count : 0,
    // Overall - All levels
    overall : {
      wins : 0,
      losses : 0,
      draws : 0,
      dkos : 0,
      total : 0
    },
    // Below level 15
    lowLevel : {
      wins : 0,
      losses : 0,
      draws : 0,
      dkos : 0,
      total : 0
    },
    // level 15-24
    lowMidLevel : {
      wins : 0,
      losses : 0,
      draws : 0,
      dkos : 0,
      total : 0
    },
    // 15 - 60
    midLevel : {
      wins : 0,
      losses : 0,
      draws : 0,
      dkos : 0,
      total : 0
    },
    // Over 60
    highLevel : {
      wins : 0,
      losses : 0,
      draws : 0,
      dkos : 0,
      total : 0
    },
    winsVs : {
      spirits : 0,
      elementals : 0,
      titans : 0
    },
    totalsVs : {
      spirits : 0,
      elementals : 0,
      titans : 0
    }
  }

  allBattles.forEach((b, i) =>{
    const level = b.level;

    switch(b.outcomeData.outcome){
      case 'Avatar Wins':
        if(level < 15){
          totals.lowLevel.wins ++;
          totals.lowLevel.total ++;
        }else if(level >= 15 && level < 60){
          totals.midLevel.wins ++;
          totals.midLevel.total ++;
          // Start of extra difficulty curve
          if(level >= 15 && level < 25){
            totals.lowMidLevel.wins ++;
            totals.lowMidLevel.total ++;
          }
        }else if(level >= 60){
          totals.highLevel.wins ++;
          totals.highLevel.total ++;
        }
        totals.overall.wins ++;
        totals.winsVs[b.foeClass.toLowerCase()] ++;
        break;
      case 'Foe Wins':
        if(level < 15){
          totals.lowLevel.losses ++;
          totals.lowLevel.total ++;
        }else if(level >= 15 && level < 60){
          totals.midLevel.losses ++;
          totals.midLevel.total ++;
          // Start of extra difficulty curve
          if(level >= 15 && level < 25){
            totals.lowMidLevel.losses ++;
            totals.lowMidLevel.total ++;
          }
        }else if(level >= 60){
          totals.highLevel.losses ++;
          totals.highLevel.total ++;
        }
        totals.overall.losses ++;
        break;
      case 'Draw':
        if(level < 15){
          totals.lowLevel.draws ++;
          totals.lowLevel.total ++;
        }else if(level >= 15 && level < 60){
          totals.midLevel.draws ++;
          totals.midLevel.total ++;
          // Start of extra difficulty curve
          if(level >= 15 && level < 25){
            totals.lowMidLevel.draws ++;
            totals.lowMidLevel.total ++;
          }
        }else if(level >= 60){
          totals.highLevel.draws ++;
          totals.highLevel.total ++;
        }
        totals.overall.draws ++;
        break;
      case 'Double KO':
        if(level < 15){
          totals.lowLevel.dkos ++;
          totals.lowLevel.total ++;
        }else if(level >= 15 && level < 60){
          totals.midLevel.dkos ++;
          totals.midLevel.total ++;
          // Start of extra difficulty curve
          if(level >= 15 && level < 25){
            totals.lowMidLevel.dkos ++;
            totals.lowMidLevel.total ++;
          }
        }else if(level >= 60){
          totals.highLevel.dkos ++;
          totals.highLevel.total ++;
        }
        totals.overall.total ++;
        totals.overall.dkos ++;
        break;
    }
    totals.count ++;
    totals.totalsVs[b.foeClass.toLowerCase()] ++;
  });

  console.log('Battle Totals - ', totals);

  const lowLevelPreBattles = preBattles.filter(battle => battle.BRA.level < 15);
  const lowLevelBattles = allBattles.slice(0,lowLevelPreBattles.length);

  //console.log('Low level prebattles -',lowLevelPreBattles.length, lowLevelPreBattles);

  //console.log('Low level battles -',lowLevelBattles.length, lowLevelBattles);

  // WIN RATES
  const lowLevelWinRate = totals.lowLevel.wins / totals.lowLevel.total;
  const midLevelWinRate = totals.midLevel.wins / totals.midLevel.total;
  const highLevelWinRate = totals.highLevel.wins / totals.highLevel.total;
  const overallWinRate = totals.overall.wins / totals.count;
  // LOSS RATES
  const lowLevelLossRate = totals.lowLevel.losses / totals.lowLevel.total;
  const midLevelLossRate = totals.midLevel.losses / totals.midLevel.total;
  const highLevelLossRate = totals.highLevel.losses / totals.highLevel.total;
  const overallLossRate = totals.overall.losses / totals.count;
  // DRAW RATES
  const lowLevelDrawRates = totals.lowLevel.draws / totals.lowLevel.total;
  const midLevelDrawRates = totals.midLevel.draws / totals.midLevel.total;
  const highLevelDrawRates = totals.highLevel.draws / totals.highLevel.total;
  const overallDrawRates = totals.overall.draws / totals.count;
  // DKO RATES
  const lowLevelDkoRates = totals.lowLevel.dkos / totals.lowLevel.total;
  const midLevelDkoRates = totals.midLevel.dkos / totals.midLevel.total;
  const highLevelDkoRates = totals.highLevel.dkos / totals.highLevel.total;
  const overallLevelDkoRates = totals.overall.dkos / totals.count;

  // WIN RATES VS FOE CLASS
  const winRateVsSpirits = totals.winsVs.spirits / totals.totalsVs.spirits;
  const winRateVsElementals = totals.winsVs.elementals / totals.totalsVs.elementals;
  const winRateVsTitans = totals.winsVs.titans / totals.totalsVs.titans;

  //console.log('TITANS - battles, winrate',totals.totalsVs.titans, winRateVsTitans);


  it('Win % for each avatar level group should be above the threshold', () =>{
    //console.log('RRR-', totals.lowLevel.wins, totals.count, (totals.lowLevel.wins / totals.count), ((totals.lowLevel.wins / totals.count) > .65));
    // Above min threshold
    
    expect(lowLevelWinRate).toBeGreaterThanOrEqual(.74);
    expect(midLevelWinRate).toBeGreaterThanOrEqual(.60);
    expect(highLevelWinRate).toBeGreaterThanOrEqual(.60);
    expect(overallWinRate).toBeGreaterThanOrEqual(.60);
    // Below max threshold
    expect(lowLevelWinRate).toBeLessThan(.85);
    expect(midLevelWinRate).toBeLessThan(.75);
    expect(highLevelWinRate).toBeLessThan(.75);
    expect(overallWinRate).toBeLessThan(.75);
  });

  it('Loss % for each avatar level group should be below the threshold', () =>{
    expect(lowLevelLossRate).toBeLessThan(.35);
    expect(midLevelLossRate).toBeLessThan(.35);
    expect(highLevelLossRate).toBeLessThan(.35);
    expect(overallLossRate).toBeLessThan(.35);
  });

  it('Draw % for each avatar level group should be below the threshold', () =>{
    expect(lowLevelDrawRates).toBeLessThan(.15);
    expect(midLevelDrawRates).toBeLessThan(.15);
    expect(highLevelDrawRates).toBeLessThan(.15);
    expect(overallDrawRates).toBeLessThan(.15);
  });

  it('DKO % for each avatar level group should be below the threshold', () =>{
    expect(lowLevelDkoRates).toBeLessThan(.15);
    expect(midLevelDkoRates).toBeLessThan(.15);
    expect(highLevelDkoRates).toBeLessThan(.15);
    expect(overallLevelDkoRates).toBeLessThan(.15);
  });

  it('Win % by class should be within threshold', () =>{
    expect(winRateVsSpirits).toBeGreaterThanOrEqual(.60);
    expect(winRateVsElementals).toBeGreaterThanOrEqual(.60);
    if(totals.totalsVs.titans > 2){
      expect(winRateVsTitans).toBeGreaterThanOrEqual(.33);
      expect(winRateVsTitans).toBeLessThanOrEqual(.66);
    }
  });

});


































/* POWER SPEC ONLY */
// describe('Battle all generated foes against av profiles', ()=>{

//   let avatars = avatarPowerSpecProfiles.map((av) => {
//     const { getCurrentLevel } = xpCalc(av.activityXP, av.battleXP);
//     return Object.assign({}, av, { level : getCurrentLevel().total });
//   });
//   let multipliedAvatars = [];
//   // Multiplies the instances of avatar profiles to create more battles
//   const battleMultiplier = 10;
//   for(let i = 0; i < battleMultiplier; i++){
//     multipliedAvatars.push(...avatars);
//   }

//   console.log('MULT AV - ', multipliedAvatars.length);

//   let foesWithStats = generateFoes(multipliedAvatars);
//   let preBattles =  generateBrs(multipliedAvatars, foesWithStats);




//   // BATTLE STEP 5 - EXCHANGE DAMAGE


//   const allBattles = preBattles.map((b) =>{
//     return Object.assign({}, doBattle(b.BRA, b.BRF, b.goesFirst), { foeType :  b.BRF.type, foeClass : b.BRF.class });
//   });

//   //console.log('FIRST BATTLE - ', allBattles[0]);

//   const totals = {
//     count : 0,
//     // Overall - All levels
//     overall : {
//       wins : 0,
//       losses : 0,
//       draws : 0,
//       dkos : 0,
//       total : 0
//     },
//     // Below level 15
//     lowLevel : {
//       wins : 0,
//       losses : 0,
//       draws : 0,
//       dkos : 0,
//       total : 0
//     },
//     // level 15-24
//     lowMidLevel : {
//       wins : 0,
//       losses : 0,
//       draws : 0,
//       dkos : 0,
//       total : 0
//     },
//     // 15 - 60
//     midLevel : {
//       wins : 0,
//       losses : 0,
//       draws : 0,
//       dkos : 0,
//       total : 0
//     },
//     // Over 60
//     highLevel : {
//       wins : 0,
//       losses : 0,
//       draws : 0,
//       dkos : 0,
//       total : 0
//     },
//     winsVs : {
//       spirits : 0,
//       elementals : 0,
//       titans : 0
//     },
//     totalsVs : {
//       spirits : 0,
//       elementals : 0,
//       titans : 0
//     }
//   }

//   allBattles.forEach((b, i) =>{
//     const level = b.level;

//     switch(b.outcomeData.outcome){
//       case 'Avatar Wins':
//         if(level < 15){
//           totals.lowLevel.wins ++;
//           totals.lowLevel.total ++;
//         }else if(level >= 15 && level < 60){
//           totals.midLevel.wins ++;
//           totals.midLevel.total ++;
//           // Start of extra difficulty curve
//           if(level >= 15 && level < 25){
//             totals.lowMidLevel.wins ++;
//             totals.lowMidLevel.total ++;
//           }
//         }else if(level >= 60){
//           totals.highLevel.wins ++;
//           totals.highLevel.total ++;
//         }
//         totals.overall.wins ++;
//         totals.winsVs[b.foeClass.toLowerCase()] ++;
//         break;
//       case 'Foe Wins':
//         if(level < 15){
//           totals.lowLevel.losses ++;
//           totals.lowLevel.total ++;
//         }else if(level >= 15 && level < 60){
//           totals.midLevel.losses ++;
//           totals.midLevel.total ++;
//           // Start of extra difficulty curve
//           if(level >= 15 && level < 25){
//             totals.lowMidLevel.losses ++;
//             totals.lowMidLevel.total ++;
//           }
//         }else if(level >= 60){
//           totals.highLevel.losses ++;
//           totals.highLevel.total ++;
//         }
//         totals.overall.losses ++;
//         break;
//       case 'Draw':
//         if(level < 15){
//           totals.lowLevel.draws ++;
//           totals.lowLevel.total ++;
//         }else if(level >= 15 && level < 60){
//           totals.midLevel.draws ++;
//           totals.midLevel.total ++;
//           // Start of extra difficulty curve
//           if(level >= 15 && level < 25){
//             totals.lowMidLevel.draws ++;
//             totals.lowMidLevel.total ++;
//           }
//         }else if(level >= 60){
//           totals.highLevel.draws ++;
//           totals.highLevel.total ++;
//         }
//         totals.overall.draws ++;
//         break;
//       case 'Double KO':
//         if(level < 15){
//           totals.lowLevel.dkos ++;
//           totals.lowLevel.total ++;
//         }else if(level >= 15 && level < 60){
//           totals.midLevel.dkos ++;
//           totals.midLevel.total ++;
//           // Start of extra difficulty curve
//           if(level >= 15 && level < 25){
//             totals.lowMidLevel.dkos ++;
//             totals.lowMidLevel.total ++;
//           }
//         }else if(level >= 60){
//           totals.highLevel.dkos ++;
//           totals.highLevel.total ++;
//         }
//         totals.overall.total ++;
//         totals.overall.dkos ++;
//         break;
//     }
//     totals.count ++;
//     totals.totalsVs[b.foeClass.toLowerCase()] ++;
//   });

//   console.log('Battle Totals - ', totals);

//   const lowLevelPreBattles = preBattles.filter(battle => battle.BRA.level < 15);
//   const lowLevelBattles = allBattles.slice(0,lowLevelPreBattles.length);

//   //console.log('Low level prebattles -',lowLevelPreBattles.length, lowLevelPreBattles);

//   //console.log('Low level battles -',lowLevelBattles.length, lowLevelBattles);

//   // WIN RATES
//   const lowLevelWinRate = totals.lowLevel.wins / totals.lowLevel.total;
//   const midLevelWinRate = totals.midLevel.wins / totals.midLevel.total;
//   const highLevelWinRate = totals.highLevel.wins / totals.highLevel.total;
//   const overallWinRate = totals.overall.wins / totals.count;
//   // LOSS RATES
//   const lowLevelLossRate = totals.lowLevel.losses / totals.lowLevel.total;
//   const midLevelLossRate = totals.midLevel.losses / totals.midLevel.total;
//   const highLevelLossRate = totals.highLevel.losses / totals.highLevel.total;
//   const overallLossRate = totals.overall.losses / totals.count;
//   // DRAW RATES
//   const lowLevelDrawRates = totals.lowLevel.draws / totals.lowLevel.total;
//   const midLevelDrawRates = totals.midLevel.draws / totals.midLevel.total;
//   const highLevelDrawRates = totals.highLevel.draws / totals.highLevel.total;
//   const overallDrawRates = totals.overall.draws / totals.count;
//   // DKO RATES
//   const lowLevelDkoRates = totals.lowLevel.dkos / totals.lowLevel.total;
//   const midLevelDkoRates = totals.midLevel.dkos / totals.midLevel.total;
//   const highLevelDkoRates = totals.highLevel.dkos / totals.highLevel.total;
//   const overallLevelDkoRates = totals.overall.dkos / totals.count;

//   // WIN RATES VS FOE CLASS
//   const winRateVsSpirits = totals.winsVs.spirits / totals.totalsVs.spirits;
//   const winRateVsElementals = totals.winsVs.elementals / totals.totalsVs.elementals;
//   const winRateVsTitans = totals.winsVs.titans / totals.totalsVs.titans;

//   //console.log('TITANS - battles, winrate',totals.totalsVs.titans, winRateVsTitans);


//   it('POWER Win % for each avatar level group should be above the threshold', () =>{
//     //console.log('RRR-', totals.lowLevel.wins, totals.count, (totals.lowLevel.wins / totals.count), ((totals.lowLevel.wins / totals.count) > .65));
//     // Above min threshold
    
//     expect(lowLevelWinRate).toBeGreaterThanOrEqual(.65);
//     expect(midLevelWinRate).toBeGreaterThanOrEqual(.65);
//     expect(highLevelWinRate).toBeGreaterThanOrEqual(.65);
//     expect(overallWinRate).toBeGreaterThanOrEqual(.65);
//     // Below max threshold
//     expect(lowLevelWinRate).toBeLessThan(.80);
//     expect(midLevelWinRate).toBeLessThan(.80);
//     expect(highLevelWinRate).toBeLessThan(.80);
//     expect(overallWinRate).toBeLessThan(.80);
//   });

//   it('POWER Loss % for each avatar level group should be below the threshold', () =>{
//     expect(lowLevelLossRate).toBeLessThan(.33);
//     expect(midLevelLossRate).toBeLessThan(.33);
//     expect(highLevelLossRate).toBeLessThan(.33);
//     expect(overallLossRate).toBeLessThan(.33);
//   });

//   it('POWER Draw % for each avatar level group should be below the threshold', () =>{
//     expect(lowLevelDrawRates).toBeLessThan(.15);
//     expect(midLevelDrawRates).toBeLessThan(.15);
//     expect(highLevelDrawRates).toBeLessThan(.15);
//     expect(overallDrawRates).toBeLessThan(.15);
//   });

//   it('POWER DKO % for each avatar level group should be below the threshold', () =>{
//     expect(lowLevelDkoRates).toBeLessThan(.15);
//     expect(midLevelDkoRates).toBeLessThan(.15);
//     expect(highLevelDkoRates).toBeLessThan(.15);
//     expect(overallLevelDkoRates).toBeLessThan(.15);
//   });

//   it('POWER Win % by class should be within threshold', () =>{
//     expect(winRateVsSpirits).toBeGreaterThanOrEqual(.65);
//     expect(winRateVsElementals).toBeGreaterThanOrEqual(.65);
//     if(totals.totalsVs.titans > 2){
//       expect(winRateVsTitans).toBeGreaterThanOrEqual(.33);
//       expect(winRateVsTitans).toBeLessThan(.66);
//     }
//   });

// });