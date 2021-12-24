const avatarProfiles = require("./heroProfiles.json");
const { selectFoeTemplate, generateFoeStats } = require("../../game/prebattle/foeFunctions");
const { calcScenarioBonuses, determineScenario } = require("../../game/battle/scenario");
const { doAvatarBattlePrep } = require("../../game/battle/doBattlePrep");
const xpCalc = require("../../game/upgrades/xpCalc");

let randomAv;
let foeTemplate;
let foeWithStats;
let sFoe, sAvatar, scenario;
let beginnersLuck = false;
const generateFoe = function (av) {
  randomAv = av[Math.floor(Math.random() * avatarProfiles.length)];
  foeTemplate = selectFoeTemplate(randomAv.level);

  const foe = {
    id: foeTemplate.id,
    type: foeTemplate.type,
    difficultyLevel: foeTemplate.difficultyLevel,
    name: foeTemplate.foe[Math.floor(Math.random() * foeTemplate.foe.length)],
    ability: foeTemplate.ability,
    class: foeTemplate.class,
  };

  foeWithStats = Object.assign({}, foe, generateFoeStats(randomAv, foe));

  // BATTLE STEP 2 - ENCOUNTER SCENARIO IS DECIDED AND BONUSES GIVEN
  scenario = determineScenario(beginnersLuck);
  const scenarioBonuses = calcScenarioBonuses(randomAv, foeWithStats, scenario);
  sAvatar = scenarioBonuses.sAvatar;
  sFoe = scenarioBonuses.sFoe;
};

beforeAll(() => generateFoe(avatarProfiles));

describe("All EXISTING item effects should correctly modify stats", () => {
  it("Should return an avatar with +10 health", () => {
    const effects = ["Hero +10 Health"];
    const { avatar, foe } = doAvatarBattlePrep(sAvatar, sFoe, effects, scenario.id);
    expect(avatar.health).toBe(sAvatar.health + 10);
  });

  it("Should return an avatar with +5 water", () => {
    const effects = ["Hero +5,+10% Water"];
    const { avatar, foe } = doAvatarBattlePrep(sAvatar, sFoe, effects, scenario.id);
    const adjustedBase = sAvatar.water + 5;
    const adjustedTotal = adjustedBase + Math.floor(adjustedBase * 0.1);
    expect(avatar.water).toBe(adjustedTotal);
  });

  it("Should return an foe with -35 or -5% health", () => {
    const effects = ["Foe -35|-5% Health"];
    const { avatar, foe } = doAvatarBattlePrep(sAvatar, sFoe, effects, scenario.id);
    const fixed = 35;
    const percentage = Math.floor(sFoe.health * 0.05);
    const adjustedTotalHealth = fixed > percentage ? sFoe.health - fixed : sFoe.health - percentage;
    expect(foe.health).toBe(adjustedTotalHealth);
  });
});

describe("All NEW item effects should correctly modify stats", () => {
  // RAVEN
  it("Should return an avatar with +5 Air & run Ill Omen buff if necessary", () => {
    const effects = ["Ill Omen"];
    const { avatar, foe } = doAvatarBattlePrep(sAvatar, sFoe, effects, scenario.id);
    console.log(sFoe.type, sFoe.difficulty, sFoe.difficultyLevel);
    const isNegativeScenario = scenario.id === 1 || scenario.id === 3 ? true : false;
    let illOmenProc = sFoe.difficultyLevel === "high" ? true : false;
    if (sFoe.difficultyLevel === "medium") {
      if (sFoe.difficulty >= 0.08 || isNegativeScenario) {
        illOmenProc = true;
      }
    }
    console.log(isNegativeScenario, sFoe.difficulty >= 0.075, illOmenProc);
    if (illOmenProc) {
      console.log("RECEIVED ILL OMEN BUFF");
      expect(avatar.health).toBe(Math.floor(sAvatar.health * 1.25));
      expect(avatar.air).toBe(Math.floor(sAvatar.air * 1.25));
    } else {
      console.log("NO ILL OMEN BUFF");
      expect(avatar.health).toBe(sAvatar.health);
      expect(avatar.air).toBe(sAvatar.air);
    }
  });

  // // HAWK
  it("Should return an avatar with +10 health & +5 Air", () => {
    const effects = ["Hero +5,+10% Air", "Hero +10,+15% Power"];
    const { avatar, foe } = doAvatarBattlePrep(sAvatar, sFoe, effects, scenario.id);
    const adjustedBasePower = sAvatar.power + 10;
    const adjustedTotalPower = adjustedBasePower + Math.floor(adjustedBasePower * 0.15);
    expect(avatar.power).toBe(adjustedTotalPower);
    const adjustedBaseAir = sAvatar.air + 5;
    const adjustedTotalAir = adjustedBaseAir + Math.floor(adjustedBaseAir * 0.1);
    expect(avatar.air).toBe(adjustedTotalAir);
  });

  // CAT
  it("Should trigger a Bad Luck Proc proc 15% of the time", () => {
    const effects = ["Bad Luck"];

    const { avatar, foe } = doAvatarBattlePrep(sAvatar, sFoe, effects, scenario.id);
    // This will only pass when Bad luck DOESN'T proc.... not sure how to handle chance with testing yet.
    //expect(foe).toEqual(expect.objectContaining(sFoe));
    expect(foe).toMatchObject({
      health: expect.toBeOneOf([sFoe.health, Math.floor(sFoe.health * 0.5)]),
      power: expect.toBeOneOf([sFoe.power, Math.floor(sFoe.power * 0.5)]),
      armor: expect.toBeOneOf([sFoe.armor, Math.floor(sFoe.armor * 0.5)]),
      fire: expect.toBeOneOf([sFoe.fire, Math.floor(sFoe.fire * 0.5)]),
      earth: expect.toBeOneOf([sFoe.earth, Math.floor(sFoe.earth * 0.5)]),
      water: expect.toBeOneOf([sFoe.water, Math.floor(sFoe.water * 0.5)]),
      air: expect.toBeOneOf([sFoe.air, Math.floor(sFoe.air * 0.5)]),
    });
  });
});

describe("Snake effects should correctly modify stats", () => {
  // SNAKE
  it("Should give avatar + 10 power and lower foes health by 10", () => {
    const effects = ["Hero +10,+15% Power", "Foe -10|3% Health", "Lethal Surprise"];

    const { avatar, foe } = doAvatarBattlePrep(sAvatar, sFoe, effects, scenario.id);
    const adjustedBasePower = sAvatar.power + 10;
    const adjustedTotalPower = adjustedBasePower + Math.floor(adjustedBasePower * 0.15);
    expect(avatar.power).toBe(adjustedTotalPower);
    if (foe.health === 1) {
      console.log("LETHAL SURPRISE PROC", foe.health, sFoe.health);
    }
    expect(foe.health).toBeOneOf([sFoe.health, sFoe.health - 10]);
  });
});

describe("Octopus effects should correctly modify stats", () => {
  // OCTOPUS
  it("Should give avatar + 5 water & possibly run Eight-Legged Ingenuity", () => {
    const effects = ["Hero +5,+10% Water", "Eight-Legged Ingenuity"];

    const { avatar, foe } = doAvatarBattlePrep(sAvatar, sFoe, effects, scenario.id);
    const adjustedBaseWater = sAvatar.water + 5;
    const adjustedTotalWater = adjustedBaseWater + Math.floor(adjustedBaseWater * 0.1);
    expect(avatar.water).toBe(adjustedTotalWater);

    const possibleNonZeroStats = ["health", "power", "earth", "water", "fire", "air", "armor"];
    const nonZero = possibleNonZeroStats.map(stat => foe[stat]).filter(Boolean);

    if (foe.armor !== sFoe.armor) {
      console.log("Eight Leg Proc, armor = ", foe.armor, sFoe.armor);
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

describe("Racoon effects should correctly modify stats", () => {
  // Racoon
  it("Should give avatar + 5 earth & possibly run Frisky Mischief", () => {
    const effects = ["Hero +5,+10% Earth", "Frisky Mischief"];
    const { avatar } = doAvatarBattlePrep(sAvatar, sFoe, effects, scenario.id);
    const adjustedBase = sAvatar.earth + 5;
    const adjustedTotal = adjustedBase + Math.floor(adjustedBase * 0.1);
    expect(avatar.earth).toBe(adjustedTotal);
    // STILL NEED TO TEST FOR FRISKY MISCHIEVOUS
  });
});

describe("Chameleon effects should correctly modify stats", () => {
  // Chameleon
  it("Should give avatar + 5 earth and +5 air", () => {
    const effects = ["Hero +5,+10% Earth", "Hero +5,+10% Air"];
    const { avatar } = doAvatarBattlePrep(sAvatar, sFoe, effects, scenario.id);
    const adjustedBaseEarth = sAvatar.earth + 5;
    const adjustedTotalEarth = adjustedBaseEarth + Math.floor(adjustedBaseEarth * 0.1);
    expect(avatar.earth).toBe(adjustedTotalEarth);

    const adjustedBaseAir = sAvatar.air + 5;
    const adjustedTotalAir = adjustedBaseAir + Math.floor(adjustedBaseAir * 0.1);
    expect(avatar.air).toBe(adjustedTotalAir);
  });
});

describe("Llama effects should correctly modify stats", () => {
  // Llama
  it("Should give avatar +25% Health Buff", () => {
    const effects = ["Hero +25% Health"];
    const { avatar } = doAvatarBattlePrep(sAvatar, sFoe, effects, scenario.id);
    expect(avatar.health).toBe(sAvatar.health + Math.floor(sAvatar.health * 0.25));
  });
});

describe("Robot effects should correctly modify stats", () => {
  // Robot
  it("Should give avatar +15 Power, +10 Armor", () => {
    const effects = ["Hero +15 Power", "Hero +10 Armor"];
    const { avatar } = doAvatarBattlePrep(sAvatar, sFoe, effects, scenario.id);
    expect(avatar.power).toBe(sAvatar.power + 15);
    expect(avatar.armor).toBe(sAvatar.armor + 10);
  });
});

describe("Unicorn effects should correctly modify stats", () => {
  // Unicorn
  it("Should give avatar +10% All Elms", () => {
    const effects = ["Hero +10% All Elements"];
    const { avatar } = doAvatarBattlePrep(sAvatar, sFoe, effects, scenario.id);
    expect(avatar.fire).toBe(sAvatar.fire + Math.floor(sAvatar.fire * 0.1));
    expect(avatar.earth).toBe(sAvatar.earth + Math.floor(sAvatar.earth * 0.1));
    expect(avatar.water).toBe(sAvatar.water + Math.floor(sAvatar.water * 0.1));
    expect(avatar.air).toBe(sAvatar.air + Math.floor(sAvatar.air * 0.1));
  });
});

describe("Dragon Whelp effects should correctly modify stats", () => {
  // Dragon Whelp
  it("Should give avatar +33% Fire", () => {
    const effects = ["Hero +33% Fire"];
    const { avatar } = doAvatarBattlePrep(sAvatar, sFoe, effects, scenario.id);
    expect(avatar.fire).toBe(sAvatar.fire + Math.floor(sAvatar.fire * 0.33));
  });
});

describe("Orchid Mantis effects should correctly modify stats", () => {
  // Orchid Mantis
  it("Should give avatar +5% All Elms, Foe -10% Health", () => {
    const effects = ["Foe -10% Health", "Hero +5% All Elements"];
    const { avatar, foe } = doAvatarBattlePrep(sAvatar, sFoe, effects, scenario.id);
    expect(foe.health).toBe(sFoe.health - Math.floor(sFoe.health * 0.1));
    expect(avatar.fire).toBe(sAvatar.fire + Math.floor(sAvatar.fire * 0.05));
    expect(avatar.earth).toBe(sAvatar.earth + Math.floor(sAvatar.earth * 0.05));
    expect(avatar.water).toBe(sAvatar.water + Math.floor(sAvatar.water * 0.05));
    expect(avatar.air).toBe(sAvatar.air + Math.floor(sAvatar.air * 0.05));
  });
});

describe("Elemental pets should correctly modify stats", () => {
  // Splash Artist
  it("Should give avatar +25,+25% Water Buff", () => {
    const effects = ["Hero +25,+25% Water"];
    const { avatar } = doAvatarBattlePrep(sAvatar, sFoe, effects, scenario.id);
    const adjustedBaseWater = sAvatar.water + 25;
    const adjustedTotalWater = adjustedBaseWater + Math.floor(adjustedBaseWater * 0.25);
    expect(avatar.water).toBe(adjustedTotalWater);
  });

  // Flame Fiend
  it("Should give avatar +25,+25% Fire Buff", () => {
    const effects = ["Hero +25,+25% Fire"];
    const { avatar } = doAvatarBattlePrep(sAvatar, sFoe, effects, scenario.id);
    const adjustedBaseFire = sAvatar.fire + 25;
    const adjustedTotalFire = adjustedBaseFire + Math.floor(adjustedBaseFire * 0.25);
    expect(avatar.fire).toBe(adjustedTotalFire);
  });

  // Rock Skipper
  it("Should give avatar +25,+25% Earth Buff", () => {
    const effects = ["Hero +25,+25% Earth"];
    const { avatar } = doAvatarBattlePrep(sAvatar, sFoe, effects, scenario.id);
    const adjustedBaseEarth = sAvatar.earth + 25;
    const adjustedTotalEarth = adjustedBaseEarth + Math.floor(adjustedBaseEarth * 0.25);
    expect(avatar.earth).toBe(adjustedTotalEarth);
  });

  // Gusty Rascal
  it("Should give avatar +25,+25% Air Buff", () => {
    const effects = ["Hero +25,+25% Air"];
    const { avatar } = doAvatarBattlePrep(sAvatar, sFoe, effects, scenario.id);
    const adjustedBaseAir = sAvatar.air + 25;
    const adjustedTotalAir = adjustedBaseAir + Math.floor(adjustedBaseAir * 0.25);
    expect(avatar.air).toBe(adjustedTotalAir);
  });
});

describe("Rabbit effects should correctly modify stats", () => {
  // Rabbit
  it("Should Adjust Armor, Air, and Power from Rabbit Tactics", () => {
    const effects = ["Rabbit Tactics"];
    const { getCurrentLevel } = xpCalc(sAvatar.activityXP, sAvatar.battleXP);
    const avatarLevel = getCurrentLevel().total;
    const naturalLogOfLevel = Math.log(avatarLevel);
    const RABBIT_TACTICS_MODIFIER = (naturalLogOfLevel * avatarLevel) / 10;
    console.log(avatarLevel);
    const expectedArmor = Math.floor(sAvatar.armor * 0.33);
    const expectedPower = Math.floor(sAvatar.power + (sAvatar.armor * 0.66 * avatarLevel) / RABBIT_TACTICS_MODIFIER) || sAvatar.power;
    const expectedAir = Math.floor(sAvatar.air + (sAvatar.armor * 0.66 * avatarLevel) / RABBIT_TACTICS_MODIFIER) || sAvatar.air;

    console.log(avatarLevel, sAvatar.power, expectedPower, sAvatar.air, expectedAir);

    const { avatar, foe } = doAvatarBattlePrep(sAvatar, sFoe, effects, scenario.id);

    expect(avatar.armor).toBe(expectedArmor);
    expect(avatar.power).toBe(expectedPower);
    expect(avatar.air).toBe(expectedAir);
  });
});
