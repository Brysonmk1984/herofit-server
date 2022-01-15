const { unitTestExporter, selectFoeTemplate } = require("../../src/game/prebattle/foeFunctions");
const { unitTestExporter: unitTestExporter2 } = require("../../src/game/prebattle/generateFoeStats");
const villains = require("../../src/game/villains.json");
const { testSpecificFoe } = require("../../src/game/specialEvents/specialEventList");

describe("Foe Generation", () => {
  const { _generateFoeName, _randomBossEncounterChance, _determineBeginnersLuck, _specialEventFoeChance, _divideAvailableFoesByDifficulty } = unitTestExporter();
  const { _determineBonusToStatsSpecialEvent } = unitTestExporter2();
  const mergedVillains = Object.values(villains).flat();
  const { low, medium, high } = _divideAvailableFoesByDifficulty(mergedVillains, 20);

  it("Should divide foes by difficulty type", () => {
    expect(low[0].difficultyLevel).toBe("low");
    expect(medium[0].difficultyLevel).toBe("medium");
    expect(high[0].difficultyLevel).toBe("high");
  });

  it("Should Return a randomly picked foe name", () => {
    const possibleNames = mergedVillains[1].foe;
    const foeName = _generateFoeName(mergedVillains[1], "Grabbler");
    expect(foeName).toBeOneOf(possibleNames);
  });

  it("Should Return name as Shadow-${name}", () => {
    const foeName = _generateFoeName(mergedVillains[8], "Grabbler");
    expect(foeName).toBe("Shadow Grabbler");
  });

  it("Should return a boolean indicating whether or not beginners luck happened for foe selection", () => {
    const beginnersLuckHappened = _determineBeginnersLuck(10);
    expect(beginnersLuckHappened).toEqual(expect.any(Boolean));
  });

  it("Should return Storming Oni, since he has a 100% chance to receieve in testSpecificFoe event", () => {
    const specialEventFoe = _specialEventFoeChance(60, testSpecificFoe);
    expect(specialEventFoe.type).toEqual("Storming Oni");
  });

  it("Should return either null or a foe template", () => {
    const possibleBossFoe = _randomBossEncounterChance(high);
    expect(possibleBossFoe).toEqual(expect.nullOrAny(Object));
  });

  it("Should return a boolean indicating whether or not beginners luck happened for foe selection", () => {
    const mockFoeStats = {
      health: 300,
      power: 300,
      armor: 50,
      fire: 100,
      earth: 100,
      water: 100,
      air: 100,
      difficulty: 0.5,
    };
    const boostedFoeStats = _determineBonusToStatsSpecialEvent(testSpecificFoe, mockFoeStats, 85);

    const expectedObject = {
      health: mockFoeStats.health,
      power: mockFoeStats.power,
      armor: mockFoeStats.armor,
      fire: mockFoeStats.fire,
      earth: mockFoeStats.earth,
      water: mockFoeStats.water,
      air: mockFoeStats.air * 1.5,
      difficulty: mockFoeStats.difficulty,
    };
    expect(boostedFoeStats).toMatchObject(expectedObject);
  });

  it("Select a foe template at random", () => {
    const foe = selectFoeTemplate(10);
    expect(foe).toEqual(expect.any(Object));
  });
});
