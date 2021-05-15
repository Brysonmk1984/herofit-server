const avatarProfiles = require('./heroProfiles.json');
const { selectFoeTemplate, generateFoeStats } = require('../game/foeFunctions');
const doScenarioAndBonus = require('../game/doScenarioAndBonus');
const { doAvatarBattlePrep, doFoeBattlePrep } = require('../game/doBattlePrep');
const doBattle = require('../game/doBattle');
const { OUTCOME_XP, FOE_NON_ACTION, AVATAR_NON_ACTION, BEGINNERS_LUCK_MAX_XP, BEGINNERS_LUCK_LIKELIHOOD } = require('../game/CONSTANTS');
const avCalc = require('../game/upgrades/avCalc');
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


describe('Load profiles and generate foes from random Profile', ()=>{

  it('Should Load profiles', ()=>{
    // make sure there is a profiles array
    expect(Array.isArray(avatarProfiles)).toBe(true);
    // Make Sure there are more than zero profiles
    expect(avatarProfiles.length).toBeGreaterThan(0);
    // Make Sure all profiles have the right properties
    expect(avatarProfiles).toEqual(
      expect.arrayContaining([ 
        expect.objectContaining({
          "activityXP": expect.any(Number),
          "battleXP": expect.any(Number),
          "air": expect.any(Number),
          "earth": expect.any(Number),
          "fire": expect.any(Number),
          "water": expect.any(Number),
          "power": expect.any(Number),
          "health": expect.any(Number),
          "armor": expect.any(Number),
          "recovery": expect.any(Number),
          "character": expect.any(String),
          "equipped": expect.any(Array),
          "name": expect.any(String),
          "description": expect.any(String),
          "level": expect.any(Number),           
        })
      ])
    )
  });


  it('Should Create a foe from the random avatar', ()=>{
    // MATCH PARTIAL
      expect(foeTemplate).toMatchObject(
        expect.objectContaining(
          {
            ability : expect.any(Object),
            foe : expect.any(Array),
            id : expect.any(Number),
            pba : expect.any(Array),
            reward : expect.any(Object),
            type : expect.any(String)
          }
        )
      )

        

    expect(foeWithStats).toMatchObject({
      id: expect.any(Number),
      type: expect.any(String),
      name: expect.any(String),
      ability: expect.objectContaining({
        effect: expect.any(String),
        name: expect.any(String),
        type: expect.any(String)
      }),
      class: expect.any(String),
      health: expect.any(Number),
      power: expect.any(Number),
      armor: expect.any(Number),
      fire: expect.any(Number),
      earth: expect.any(Number),
      water: expect.any(Number),
      air: expect.any(Number),
      difficulty: expect.any(Number)
    });

  });


});


xdescribe('Do battle setup with random av and generated foe template', ()=>{
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
    const { scenario, sAvatar, sFoe  } = doScenarioAndBonus(randomAv, foeWithStats, beginnersLuck);
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
        const foeBP = doFoeBattlePrep(BRF, BRA, null, foeWithStats.ability);
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
    expect(['Avatar', 'Foe']).toContain(goesFirst);
  });


  it('Should run battle with first profile and generated foe', ()=>{
    // BATTLE STEP 5 - EXCHANGE DAMAGE
    const b = doBattle(BRA, BRF, goesFirst);
    
    // Battle results should look a specific way
    expect(b).toEqual({
      // Make sure totals add up
      aElmDamage: expect.objectContaining({ fire : expect.any(Number), earth : expect.any(Number), water : expect.any(Number), air : expect.any(Number), total : (b.aElmDamage.fire + b.aElmDamage.air + b.aElmDamage.water + b.aElmDamage.earth) }),
      fElmReduction: expect.objectContaining({ fire : expect.any(Number), earth : expect.any(Number), water : expect.any(Number), air : expect.any(Number), total : (b.fElmReduction.fire + b.fElmReduction.air + b.fElmReduction.water + b.fElmReduction.earth) }),
      fElmDamage: expect.objectContaining({ fire : expect.any(Number), earth : expect.any(Number), water : expect.any(Number), air : expect.any(Number), total : (b.fElmDamage.fire + b.fElmDamage.air + b.fElmDamage.water + b.fElmDamage.earth) }),
      aElmReduction: expect.objectContaining({ fire : expect.any(Number), earth : expect.any(Number), water : expect.any(Number), air : expect.any(Number), total : (b.aElmReduction.fire + b.aElmReduction.air + b.aElmReduction.water + b.aElmReduction.earth) }),
      aPhyDamage: expect.any(Number),
      fPhyReduction: expect.any(Number),
      fPhyDamage: expect.any(Number),
      aPhyReduction: expect.any(Number),
      aHealthRemaining: expect.any(Number),
      fHealthRemaining: expect.any(Number),
      outcomeData: expect.objectContaining({
        outcome: expect.any(String),
        avatarStatus: expect.any(String),
        foeStatus: expect.any(String)
      }),
      roundBreakdown: expect.any(Array)
    });
  });



});




    

