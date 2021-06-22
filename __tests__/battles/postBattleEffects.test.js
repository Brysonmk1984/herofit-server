const avatarProfiles = require('./heroProfiles.json');
const { selectFoeTemplate, generateFoeStats } = require('../../game/foeFunctions');
const { calcScenarioBonuses, determineScenario } = require('../../game/battle/scenario');
const { doFoeBattlePrep } = require('../../game/battle/doBattlePrep');
const doBattle = require('../../game/battle/doBattle');
const postBattleProcess = require('../../game/battle/postBattleProcess');
const { FOE_NON_ACTION, BEGINNERS_LUCK_MAX_XP, BEGINNERS_LUCK_LIKELIHOOD } = require('../../game/CONSTANTS');
const avCalc = require('../../game/upgrades/avCalc');
const chance = require('chance')();


// Use toEqual for objects and arrays
// Use toBe for scalar (primitive) data types only. 
// check the response data type use typeof operator

beforeAll(() => generateFoe(avatarProfiles));
let randomAv;
let foeTemplate;
let foeWithStats;
const generateFoe = function(av){
  randomAv = av[ Math.floor( Math.random() * avatarProfiles.length ) ];
  foeTemplate = selectFoeTemplate(randomAv.level);

  const foe = {
    id : foeTemplate.id,
    type : foeTemplate.type,
    name : foeTemplate.foe[Math.floor(Math.random() * foeTemplate.foe.length)],
    ability : foeTemplate.ability,
    class : foeTemplate.class
  }

  foeWithStats = Object.assign({}, foe, generateFoeStats(randomAv, foe));
};


describe('Do battle setup with random av and generated foe template', ()=>{
  let BRA;
  let BRF;
  let goesFirst;
  function generateBraBrf(){
    const { determineAstrologySeason } = avCalc();
    const seasonalBonusElement = determineAstrologySeason(Date.now()).element.toLowerCase();

    // Beginners luck Makes unfavorable scenarios and foe goesFirst less common for players below level 15
    let beginnersLuck = false;
    const avTXP = randomAv.activityXP + randomAv.battleXP;
    if(avTXP < BEGINNERS_LUCK_MAX_XP){
      beginnersLuck = chance.bool({ likelihood: BEGINNERS_LUCK_LIKELIHOOD});
    }

    // BATTLE STEP 2 - ENCOUNTER SCENARIO IS DECIDED AND BONUSES GIVEN
    const scenario = determineScenario(beginnersLuck);
    const scenarioBonuses = calcScenarioBonuses(randomAv, foeWithStats, scenario);
    const sAvatar = scenarioBonuses.sAvatar;
    const sFoe = scenarioBonuses.sFoe;

    //console.log('sFOE - ', sFoe);
    // avatar and foe to be used for battle
    BRA = Object.assign({}, sAvatar);
    BRF = Object.assign({}, sFoe);

    // Element by Seasonal Element Bonus
    BRA[seasonalBonusElement] = BRA[seasonalBonusElement] * 1.25;
    BRF[seasonalBonusElement] = BRF[seasonalBonusElement] * 1.25;

    // BATTLE STEP 3 - NOT IN GAME YET

    // BATTLE STEP 4 - FOE USES prebattle ABILITY
    if(foeWithStats.ability && foeWithStats.ability.type === 'prebattle'){
      if(scenario.id !== FOE_NON_ACTION){
        const foeBP = doFoeBattlePrep(BRA, BRF, foeWithStats.ability);
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
    
    
  }

  beforeAll(() => generateBraBrf())
  it('Should Generate a BRA, BRF, and finish battle setup', ()=>{
    //console.log('BRA-', BRA, 'BRF', BRF);
    expect(BRA).toBeDefined();
    expect(BRF).toBeDefined();
    expect(goesFirst).toBeOneOf(['Avatar', 'Foe']);
  });

  //// Adaptive Camouflage - chameleon
  // it('Should run battle, then test Adaptive Camouflage pet ability', () => {
  //   BRF.power += 1000;
  //   // BATTLE STEP 5 - EXCHANGE DAMAGE
  //   const b = doBattle(BRA, BRF, goesFirst);
  //   const { doPostBattleEffects, getPostBattlePackage } =  postBattleProcess(BRA, BRF, b.outcomeData, b.aHealthRemaining);
  //   const effects = [{ name : 'Adaptive Camouflage', type : 'postbattle' }];
  //   doPostBattleEffects(effects);
  //   const { postAv, postOutcome } = getPostBattlePackage();
  //   if(postAv.health === 1){
  //     console.log('camo worked = ', postAv.health);
  //     expect(postOutcome.outcome).toBe('Draw');
  //   }
  //   expect(postAv.health).toBeOneOf([1,0, b.aHealthRemaining]);
    
  // });

  // // Unstable Prototype - Robot
  // it('Should run battle, then test Unstable ProtoType pet ability', () => {
  //   BRF.power += 1000;
  //   // BATTLE STEP 5 - EXCHANGE DAMAGE
  //   const b = doBattle(BRA, BRF, goesFirst);
  //   const { doPostBattleEffects, getPostBattlePackage } =  postBattleProcess(BRA, BRF, b.outcomeData, b.aHealthRemaining);
  //   const effects = [{ name : 'Unstable Prototype', type : 'postbattle' }];
  //   doPostBattleEffects(effects);
  //   const { postAv, postOutcome } = getPostBattlePackage();

  //   if(postOutcome.outcome === 'Double KO' && b.fHealthRemaining > 0){
  //     console.log('Self-destruct worked');
  //     expect(postOutcome.outcome).toBe('Double KO');
  //   }
  // });

  // // Heroes Never Die - Unicorn
  // it('Should run battle, then test Heroes Never Die pet ability', () => {
  //   BRF.power += 1000;
  //   // BATTLE STEP 5 - EXCHANGE DAMAGE
  //   const b = doBattle(BRA, BRF, goesFirst);
  //   const { doPostBattleEffects, getPostBattlePackage } =  postBattleProcess(BRA, BRF, b.outcomeData, b.aHealthRemaining);
  //   const effects = [{ name : 'Heroes Never Die', type : 'postbattle' }];
  //   doPostBattleEffects(effects);
  //   const { postAv, postOutcome } = getPostBattlePackage();

  //   if((postOutcome.outcome === 'Foe Wins' || postOutcome.outcome === 'Double KO') && postAv.health === 1){
  //     console.log('Heroes Never Die WORKED');
  //     expect(postAv.health).toBe(1);
  //   }
  // });

  // +15 Damage Afterburn - Dragon Whelp
  it('Should run battle, then test +25 Damage Afterburn ability', () => {
    //BRF.power += 1000;
    // BATTLE STEP 5 - EXCHANGE DAMAGE
    const b = doBattle(BRA, BRF, goesFirst);
    const { doPostBattleEffects, getPostBattlePackage } =  postBattleProcess(BRA, BRF, b.outcomeData, b.aHealthRemaining, b.fHealthRemaining);
    const effects = [{ name : '+15 Damage Afterburn', type : 'postbattle' }];
    doPostBattleEffects(effects);
    const { postAv, postOutcome, postFoe } = getPostBattlePackage();

    // IF Afterburn killed opponent after a Loss
    if((b.outcomeData.outcome === 'Foe Wins')){
      if(b.fHealthRemaining -25 <= 0){
        expect(postOutcome.outcome).toBe('Double KO');
      }
      console.log('Foe Health before and after Afterburn = ', b.fHealthRemaining, postFoe.health);
      expect(postFoe.health).toBeLessThan(b.fHealthRemaining);
    }

    // IF Afterburn killed opponent after a draw
    if((b.outcomeData.outcome === 'Draw')){
      if(b.fHealthRemaining -25 <= 0){
        expect(postOutcome.outcome).toBe('Avatar Wins');
      }
      console.log('Foe Health before and after Afterburn = ', b.fHealthRemaining, postFoe.health);
      expect(postFoe.health).toBeLessThan(b.fHealthRemaining);
    }
  });

});




    

