const avatarProfiles = require('./heroProfiles.json');
const { selectFoeTemplate, generateFoeStats } = require('../../game/prebattle/foeFunctions');
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
      "name" : "Hero +5,+10% Water",
      "type" : "prebattle",
      "description" : "Hero receives a +5 Water buff before battle."
    }];
    const { avatar, foe } = doAvatarBattlePrep(sAvatar, sFoe, effects, scenario.id);
    const adjustedBase = sAvatar.water + 5;
    const adjustedTotal = adjustedBase + Math.floor(adjustedBase * .1);
    expect(avatar.water).toBe(adjustedTotal);
  });


  it('Should return an foe with -35 or -5% health', () => {
    const effects = [ {
      "name": "Foe -35|-5% Health",
      "type": "prebattle",
      "description": "Foe receives a -35 or -5% health debuff (whichever is greater) before battle."
  }];
    const { avatar, foe } = doAvatarBattlePrep(sAvatar, sFoe, effects, scenario.id);
    const fixed = 35;
    const percentage = Math.floor(sFoe.health * .05)
    const adjustedTotalHealth = fixed > percentage ? (sFoe.health - fixed) : (sFoe.health - percentage);
    expect(foe.health).toBe(adjustedTotalHealth);
  });
});


describe('All NEW item effects should correctly modify stats', ()=>{
  // HAWK
  it('Should return an avatar with +10 health & +5 Air', () => {
    const effects =   [{
      "name" : "Hero +5,+10% Air",
      "type" : "prebattle",
      "description" : "Hero receives a +5 air buff before battle."
    },
    {
      "name" : "Hero +10,+15% Power",
      "type" : "prebattle",
      "description" : "Hero receives a +10 power buff before battle."
    }];
    const { avatar, foe } = doAvatarBattlePrep(sAvatar, sFoe, effects, scenario.id);
    const adjustedBasePower = sAvatar.power + 10;
    const adjustedTotalPower = adjustedBasePower + Math.floor(adjustedBasePower * .15);
    expect(avatar.power).toBe(adjustedTotalPower);
    const adjustedBaseAir = sAvatar.air + 5;
    const adjustedTotalAir = adjustedBaseAir + Math.floor(adjustedBaseAir * .1);
    expect(avatar.air).toBe(adjustedTotalAir);
  });

  // RAVEN
  it('Should return an avatar with +5 Air & run Ill Omen buff if necessary', () => {
    const effects =   [{
      "name" : "Hero +5,+10% Air",
      "type" : "prebattle",
      "description" : "Hero receives a +5 air buff before battle."
    },
    {
      "name" : "Ill Omen",
      "type" : "prebattle",
      "description" : "If there''s an unfavorable battle ahead, the Raven of Omens has a high chance to give a 20% health buff."
    }];
    const { avatar, foe } = doAvatarBattlePrep(sAvatar, sFoe, effects, scenario.id);
    const adjustedBase = sAvatar.air + 5;
    const adjustedTotal = adjustedBase + Math.floor(adjustedBase * .1);
    expect(avatar.air).toBe(adjustedTotal);

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
      "name" : "Hero +10,+15% Power",
      "type" : "prebattle",
      "description" : "Hero receives a +10 power buff before battle."
      },
      {
      "name" : "Foe -10|3% Health",
      "type" : "prebattle",
      "description" : "Foe receives a -10 health debuff before battle."
      },
      {
        "name" : "Lethal Surprise",
        "type" : "prebattle",
        "description" : "Very small chance to lower foe health to 1 before battle."
      }];

      const { avatar, foe } = doAvatarBattlePrep(sAvatar, sFoe, effects, scenario.id);
      const adjustedBasePower = sAvatar.power + 10;
      const adjustedTotalPower = adjustedBasePower + Math.floor(adjustedBasePower * .15);
      expect(avatar.power).toBe(adjustedTotalPower);
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
      "name" : "Hero +5,+10% Water",
      "type" : "prebattle",
      "description" : "Hero receives a +5 water buff before battle."
      },
      {
      "name" : "Eight-Legged Ingenuity",
      "type" : "prebattle",
      "description" : "The Octopus of Cunning has a chance to scramble foe''s stats."
      }];

      const { avatar, foe } = doAvatarBattlePrep(sAvatar, sFoe, effects, scenario.id);
      const adjustedBaseWater = sAvatar.water + 5;
      const adjustedTotalWater = adjustedBaseWater + Math.floor(adjustedBaseWater * .1);
      expect(avatar.water).toBe(adjustedTotalWater);

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
      "name" : "Hero +5,+10% Earth",
      "type" : "prebattle",
      "description" : "Hero receives a +5 earth buff before battle."
      },
      {
      "name" : "Frisky Mischief",
      "type" : "prebattle",
      "description" : "The Feisty Coon has a chance to exchange your lowest stat for the foe''s same stat."
      }];
      const { avatar } = doAvatarBattlePrep(sAvatar, sFoe, effects, scenario.id);
      const adjustedBase = sAvatar.earth + 5;
      const adjustedTotal = adjustedBase + Math.floor(adjustedBase * .1);
      expect(avatar.earth).toBe(adjustedTotal);
      // STILL NEED TO TEST FOR FRISKY MISCHIEVOUS
  });
});


describe('Chameleon effects should correctly modify stats', ()=>{
  // Chameleon
  it('Should give avatar + 5 earth and +5 air', ()=>{
    const effects = [{
      "name" : "Hero +5,+10% Earth",
      "type" : "prebattle",
      "description" : "Hero receives a +5 earth buff before battle."
      },
      {
        "name" : "Hero +5,+10% Air",
        "type" : "prebattle",
        "description" : "Hero receives a +5 air buff before battle."
      }];
      const { avatar } = doAvatarBattlePrep(sAvatar, sFoe, effects, scenario.id);
      const adjustedBaseEarth = sAvatar.earth + 5;
      const adjustedTotalEarth = adjustedBaseEarth + Math.floor(adjustedBaseEarth * .1);
      expect(avatar.earth).toBe(adjustedTotalEarth);
      
      const adjustedBaseAir = sAvatar.air + 5;
      const adjustedTotalAir = adjustedBaseAir + Math.floor(adjustedBaseAir * .1);
      expect(avatar.air).toBe(adjustedTotalAir);
  });
});

describe('Llama effects should correctly modify stats', ()=>{
  // Llama
  it('Should give avatar +25% Health Buff', ()=>{
    const effects = [{
      "name" : "Hero +25% Health",
      "type" : "prebattle",
      "description" : "Hero receives a +25% health buff before battle."
      }];
      const { avatar } = doAvatarBattlePrep(sAvatar, sFoe, effects, scenario.id);
      expect(avatar.health).toBe(sAvatar.health + Math.floor(sAvatar.health * .25));
  });
});

describe('Robot effects should correctly modify stats', ()=>{
  // Robot
  it('Should give avatar +15 Power, +10 Armor', ()=>{
    const effects = [{
      "name" : "Hero +15 Power",
      "type" : "prebattle",
      "description" : "Hero receives a +15 Power buff before battle."
      },
      {
        "name" : "Hero +10 Armor",
        "type" : "prebattle",
        "description" : "Hero receives a +10 armor buff before battle."
      }];
      const { avatar } = doAvatarBattlePrep(sAvatar, sFoe, effects, scenario.id);
      expect(avatar.power).toBe(sAvatar.power +15);
      expect(avatar.armor).toBe(sAvatar.armor +10);
  });
});

describe('Unicorn effects should correctly modify stats', ()=>{
  // Unicorn
  it('Should give avatar +10% All Elms', ()=>{
    const effects = [{
      "name" : "Hero +10% All Elements",
      "type" : "prebattle",
      "description" : "Hero receives a +10% All Elements buff to All Elements before battle."
      }];
      const { avatar } = doAvatarBattlePrep(sAvatar, sFoe, effects, scenario.id);
      expect(avatar.fire).toBe(sAvatar.fire + Math.floor(sAvatar.fire * .10));
      expect(avatar.earth).toBe(sAvatar.earth + Math.floor(sAvatar.earth * .10));
      expect(avatar.water).toBe(sAvatar.water + Math.floor(sAvatar.water * .10));
      expect(avatar.air).toBe(sAvatar.air + Math.floor(sAvatar.air * .10));
  });
});

describe('Dragon Whelp effects should correctly modify stats', ()=>{
  // Dragon Whelp
  it('Should give avatar +33% Fire', ()=>{
    const effects = [{
      "name" : "Hero +33% Fire",
      "type" : "prebattle",
      "description" : "Hero receives a +33% Fire buff before battle."
      }];
      const { avatar } = doAvatarBattlePrep(sAvatar, sFoe, effects, scenario.id);
      expect(avatar.fire).toBe(sAvatar.fire + Math.floor(sAvatar.fire * .33));
  });
});

describe('Orchid Mantis effects should correctly modify stats', ()=>{
  // Orchid Mantis
  it('Should give avatar +5% All Elms, Foe -10% Health', ()=>{
    const effects = [{
      "name" : "Foe -10% Health",
      "type" : "prebattle",
      "description" : "Foe Received a -10% Health debuff before battle."
      },
      {
        "name" : "Hero +5% All Elements",
        "type" : "prebattle",
        "description" : "Hero receives a +5% All Elements buff to All Elements before battle."
      }];
      const { avatar, foe } = doAvatarBattlePrep(sAvatar, sFoe, effects, scenario.id);
      expect(foe.health).toBe(sFoe.health - Math.floor(sFoe.health * .1));
      expect(avatar.fire).toBe(sAvatar.fire + Math.floor(sAvatar.fire * .05));
      expect(avatar.earth).toBe(sAvatar.earth + Math.floor(sAvatar.earth * .05));
      expect(avatar.water).toBe(sAvatar.water + Math.floor(sAvatar.water * .05));
      expect(avatar.air).toBe(sAvatar.air + Math.floor(sAvatar.air * .05));
  });
});


describe('Elemental pets should correctly modify stats', ()=>{
  // Splash Artist
  it('Should give avatar +25,+25% Water Buff', ()=>{
    const effects = [{
          "name": "Hero +25,+25% Water",
          "type": "prebattle",
          "description": "Hero receives a +25 and a +25% water buff before battle."
      }];
      const { avatar } = doAvatarBattlePrep(sAvatar, sFoe, effects, scenario.id);
      const adjustedBaseWater = sAvatar.water + 25;
      const adjustedTotalWater = adjustedBaseWater + Math.floor(adjustedBaseWater * .25);
      expect(avatar.water).toBe(adjustedTotalWater);
  });

  // Flame Fiend
  it('Should give avatar +25,+25% Fire Buff', ()=>{
    const effects = [{
          "name": "Hero +25,+25% Fire",
          "type": "prebattle",
          "description": "Hero receives a +25 and a +25% water buff before battle."
      }];
      const { avatar } = doAvatarBattlePrep(sAvatar, sFoe, effects, scenario.id);
      const adjustedBaseFire = sAvatar.fire + 25;
      const adjustedTotalFire = adjustedBaseFire + Math.floor(adjustedBaseFire * .25);
      expect(avatar.fire).toBe(adjustedTotalFire);
  });

  // Rock Skipper
  it('Should give avatar +25,+25% Earth Buff', ()=>{
    const effects = [{
          "name": "Hero +25,+25% Earth",
          "type": "prebattle",
          "description": "Hero receives a +25 and a +25% earth buff before battle."
      }];
      const { avatar } = doAvatarBattlePrep(sAvatar, sFoe, effects, scenario.id);
      const adjustedBaseEarth = sAvatar.earth + 25;
      const adjustedTotalEarth = adjustedBaseEarth + Math.floor(adjustedBaseEarth * .25);
      expect(avatar.earth).toBe(adjustedTotalEarth);
  });

  // Gusty Rascal
  it('Should give avatar +25,+25% Air Buff', ()=>{
    const effects = [{
          "name": "Hero +25,+25% Air",
          "type": "prebattle",
          "description": "Hero receives a +25 and a +25% air buff before battle."
      }];
      const { avatar } = doAvatarBattlePrep(sAvatar, sFoe, effects, scenario.id);
      const adjustedBaseAir = sAvatar.air + 25;
      const adjustedTotalAir = adjustedBaseAir + Math.floor(adjustedBaseAir * .25);
      expect(avatar.air).toBe(adjustedTotalAir);
  });
});