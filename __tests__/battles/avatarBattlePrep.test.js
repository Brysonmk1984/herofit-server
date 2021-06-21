const avatarProfiles = require('./heroProfiles.json');
const { selectFoeTemplate, generateFoeStats } = require('../../game/foeFunctions');
const { calcScenarioBonuses, determineScenario } = require('../../game/battle/scenario');
const { doAvatarBattlePrep } = require("../../game/battle/doBattlePrep"); 

let randomAv;
let foeTemplate;
let foeWithStats;
let sFoe, sAvatar, scenario;
let beginnersLuck = false;
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

  // BATTLE STEP 2 - ENCOUNTER SCENARIO IS DECIDED AND BONUSES GIVEN
  scenario = determineScenario(beginnersLuck);
  const scenarioBonuses = calcScenarioBonuses(randomAv, foeWithStats, scenario);
  sAvatar = scenarioBonuses.sAvatar;
  sFoe = scenarioBonuses.sFoe;
}


beforeAll(() => generateFoe(avatarProfiles));



describe('All EXISTING item effects should correctly modify stats', ()=>{
  it('Should return an avatar with +10 health', () => {
    const effects = [{
      "name" : "Hero +10 Health",
      "type" : "prebattle",
      "description" : "Hero receives a +10 health buff before battle."
    }];
    const { avatar, foe } = doAvatarBattlePrep(sAvatar, sFoe, effects, scenario.id);
    expect(avatar.health).toBe(sAvatar.health + 10);
  });

  it('Should return an avatar with +5 water', () => {
    const effects = [{
      "name" : "Hero +5 Water",
      "type" : "prebattle",
      "description" : "Hero receives a +5 Water buff before battle."
    }];
    const { avatar, foe } = doAvatarBattlePrep(sAvatar, sFoe, effects, scenario.id);
    expect(avatar.water).toBe(sAvatar.water + 5);
  });


  it('Should return an foe with -15 health', () => {
    const effects = [{
      "name" : "Foe -15 Health",
      "type" : "prebattle",
      "description" : "Hero receives a -15 health debuff before battle."
    }];
    const { avatar, foe } = doAvatarBattlePrep(sAvatar, sFoe, effects, scenario.id);

    expect(foe.health).toBe(sFoe.health - 15);
  });
});


describe('All NEW item effects should correctly modify stats', ()=>{
  // HAWK
  it('Should return an avatar with +10 health & +5 Air', () => {
    const effects =   [{
      "name" : "Hero +5 Air",
      "type" : "prebattle",
      "description" : "Hero receives a +5 air buff before battle."
    },
    {
      "name" : "Hero +10 Power",
      "type" : "prebattle",
      "description" : "Hero receives a +10 power buff before battle."
    }];
    const { avatar, foe } = doAvatarBattlePrep(sAvatar, sFoe, effects, scenario.id);
    expect(avatar.power).toBe(sAvatar.power + 10);
    expect(avatar.air).toBe(sAvatar.air + 5);
  });

  // RAVEN
  it('Should return an avatar with +5 Air & run Ill Omen buff if necessary', () => {
    const effects =   [{
      "name" : "Hero +5 Air",
      "type" : "prebattle",
      "description" : "Hero receives a +5 air buff before battle."
    },
    {
      "name" : "Ill Omen",
      "type" : "prebattle",
      "description" : "If there''s an unfavorable battle ahead, the Raven of Omens has a high chance to give a 20% health buff."
    }];
    const { avatar, foe } = doAvatarBattlePrep(sAvatar, sFoe, effects, scenario.id);
    expect(avatar.air).toBe(sAvatar.air + 5);

    const isNegativeScenario = scenario.id === 1 || scenario.id === 3 ? true : false;
    const isHigherDifficulty = sFoe.difficulty >= .07 || sFoe.class === 'titan' || sFoe.type === "Shadow Self";
    
    if(isNegativeScenario && isHigherDifficulty){
      console.log('RECEIVED ILL OMEN BUFF');
      expect(avatar.health).toBe(sAvatar.health * 1.20);
    }else{
      console.log('NO ILL OMEN BUFF');
      expect(avatar.health).toBe(sAvatar.health);
    }

  });


  // CAT
  it('Should trigger a Bad Luck Proc proc 15% of the time', () => {
    const effects =   [{
      "name" : "Bad Luck",
      "type" : "prebattle",
      "description" : "The Black Cat has a chance to reduce a random stat of your opponent by 50%."
    }];

    const { avatar, foe } = doAvatarBattlePrep(sAvatar, sFoe, effects, scenario.id);
    // This will only pass when Bad luck DOESN'T proc.... not sure how to handle chance with testing yet.
    //expect(foe).toEqual(expect.objectContaining(sFoe));
    expect(foe).toMatchObject({
      health: expect.toBeOneOf([sFoe.health, Math.floor((sFoe.health*.5))]),
      power: expect.toBeOneOf([sFoe.power, Math.floor((sFoe.power*.5))]),
      armor: expect.toBeOneOf([sFoe.armor, Math.floor((sFoe.armor*.5))]),
      fire: expect.toBeOneOf([sFoe.fire, Math.floor((sFoe.fire*.5))]),
      earth: expect.toBeOneOf([sFoe.earth, Math.floor((sFoe.earth*.5))]),
      water: expect.toBeOneOf([sFoe.water, Math.floor((sFoe.water*.5))]),
      air: expect.toBeOneOf([sFoe.air, Math.floor((sFoe.air*.5))]),
    });
  });
});

describe('Snake effects should correctly modify stats', ()=>{
  // SNAKE
  it('Should give avatar + 10 power and lower foes health by 10', ()=>{
    const effects = [{
      "name" : "Hero +10 Power",
      "type" : "prebattle",
      "description" : "Hero receives a +10 power buff before battle."
      },
      {
      "name" : "Foe -10 Health",
      "type" : "prebattle",
      "description" : "Foe receives a -10 health debuff before battle."
      },
      {
        "name" : "Lethal Surprise",
        "type" : "prebattle",
        "description" : "Very small chance to lower foe health to 1 before battle."
      }];

      const { avatar, foe } = doAvatarBattlePrep(sAvatar, sFoe, effects, scenario.id);
      expect(avatar.power).toBe(sAvatar.power +10);
      if(foe.health === 1){
        console.log('LETHAL SURPRISE PROC', foe.health, sFoe.health);
      }
      expect(foe.health).toBeOneOf([sFoe.health, sFoe.health-10]);

  });
});

describe('Octopus effects should correctly modify stats', ()=>{
  // OCTOPUS
  it('Should give avatar + 5 water & possibly run Eight-Legged Ingenuity', ()=>{
    const effects = [{
      "name" : "Hero +5 Water",
      "type" : "prebattle",
      "description" : "Hero receives a +5 water buff before battle."
      },
      {
      "name" : "Eight-Legged Ingenuity",
      "type" : "prebattle",
      "description" : "The Octopus of Cunning has a chance to scramble foe''s stats."
      }];

      const { avatar, foe } = doAvatarBattlePrep(sAvatar, sFoe, effects, scenario.id);
      expect(avatar.water).toBe(sAvatar.water +5);

      const possibleNonZeroStats = ['health','power', 'earth', 'water', 'fire', 'air', 'armor'];
      const nonZero = possibleNonZeroStats.map((stat) => foe[stat]).filter(Boolean);
 
      if(foe.armor !== sFoe.armor){
        console.log('Eight Leg Proc, armor = ', foe.armor, sFoe.armor);
      }
      expect(foe).toMatchObject({
        health: expect.toBeOneOf(nonZero),
        power: expect.toBeOneOf(nonZero),
        armor: expect.toBeOneOf(nonZero),
        fire: sFoe.fire ? expect.toBeOneOf(nonZero) : 0,
        earth: sFoe.earth ? expect.toBeOneOf(nonZero) : 0,
        water: sFoe.water ? expect.toBeOneOf(nonZero) : 0,
        air: sFoe.air ? expect.toBeOneOf(nonZero) : 0,
      });
  });
});


describe('Racoon effects should correctly modify stats', ()=>{
  // Racoon
  it('Should give avatar + 5 earth & possibly run Frisky Mischief', ()=>{
    const effects = [{
      "name" : "Hero +5 Earth",
      "type" : "prebattle",
      "description" : "Hero receives a +5 water buff before battle."
      },
      {
      "name" : "Frisky Mischief",
      "type" : "prebattle",
      "description" : "The Feisty Coon has a chance to exchange your lowest stat for the foe''s same stat."
      }];

      const { avatar, foe } = doAvatarBattlePrep(sAvatar, sFoe, effects, scenario.id);

      
      expect(avatar.earth).toBe(sAvatar.earth +5);


  });
});

