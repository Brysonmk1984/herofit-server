const avatarProfiles = require('./heroProfiles.json');
const { selectFoeTemplate, generateFoeStats } = require('../game/foeFunctions');
const doScenarioAndBonus = require('../game/doScenarioAndBonus');
const { doAvatarBattlePrep, doFoeBattlePrep } = require('../game/doBattlePrep');
const doBattle = require('../game/doBattle');
const { OUTCOME_XP, FOE_NON_ACTION, AVATAR_NON_ACTION, BEGINNERS_LUCK_MAX_XP, BEGINNERS_LUCK_LIKELIHOOD } = require('../game/constants');
const avCalc = require('../game/upgrades/avCalc');
const chance = require('chance')();
jest.setTimeout(5 * 60 * 1000);

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
    const { scenario, sAvatar, sFoe  } = doScenarioAndBonus(av, foesWithStats[i], beginnersLuck);
    //console.log('sFOE - ', sFoe);
    // avatar and foe to be used for battle
    BRA = Object.assign({}, sAvatar);
    BRF = Object.assign({}, sFoe);

    // Element by Seasonal Element Bonus
    BRA[seasonalBonusElement] = BRA[seasonalBonusElement] * 1.25;
    BRF[seasonalBonusElement] = BRF[seasonalBonusElement] * 1.25;

    // BATTLE STEP 3 - NOT IN GAME YET

    // BATTLE STEP 4 - FOE USES PRE-BATTLE ABILITY
    if(foesWithStats[i].ability && foesWithStats[i].ability.type === 'pre-battle'){
      if(scenario.id !== FOE_NON_ACTION){
        const foeBP = doFoeBattlePrep(BRF, BRA, null, foesWithStats[i].ability);
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

  let avatars = avatarProfiles;
  let foesWithStats = generateFoes(avatars);
  let preBattles =  generateBrs(avatars, foesWithStats);



  // BATTLE STEP 5 - EXCHANGE DAMAGE


  const allBattles = preBattles.map((b) =>{
    return doBattle(b.BRA, b.BRF, b.goesFirst);
  });

  const totals = {
    wins : 0,
    losses : 0,
    draws : 0,
    dkos : 0
  }

  allBattles.forEach((b) =>{

    switch(b.outcomeData.outcome){
      case 'Avatar Wins':
        totals.wins ++;
        break;
      case 'Foe Wins':
        totals.losses ++;
        break;
      case 'Draw':
        totals.draws ++;
        break;
      case 'Double KO':
        totals.dkos ++;
        break;
    }
  });



  console.log('ABT - ', totals);

  it('allBattles', () =>{
    expect(allBattles.length).toBe(35);
  })

});
