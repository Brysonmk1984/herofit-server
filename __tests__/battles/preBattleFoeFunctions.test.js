const { unitTestExporter, selectFoeTemplate } = require("../../src/game/prebattle/foeFunctions");
const villains = require("../../src/game/villains.json");

describe("Foe Generation", () => {
  const { _divideAvailableFoesByDifficulty } = unitTestExporter();

  it("Should divide foes by difficulty type", () => {
    const mergedVillains = Object.values(villains).flat();
    const { low, medium, high } = _divideAvailableFoesByDifficulty(mergedVillains, 20);

    expect(low[0].difficultyLevel).toBe("low");
    expect(medium[0].difficultyLevel).toBe("medium");
    expect(high[0].difficultyLevel).toBe("high");
  });

  it("Select a foe template at random", () => {
    const foe = selectFoeTemplate(10);
    expect(foe).toEqual(expect.any(Object));
  });
});
