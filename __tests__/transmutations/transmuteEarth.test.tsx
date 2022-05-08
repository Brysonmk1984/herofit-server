import avCalc from "../../src/game/upgrades/avCalc";
import { HeroWithTransmutations } from "../../src/types/BackendOnlyTypes";
import heroProfiles from "./heroProfiles.json";

describe("EARTH TRANSMUTATION - All other elements to EARTH", () => {
  const { transmuteElements, determineNetTransmutedElementalValues } = avCalc();
  const hero = heroProfiles[3] as unknown as HeroWithTransmutations;

  it("Should improve EARTH by 2 and FIRE by zero", () => {
    const improvements = { power: 0, "max health": 0, health: 0, air: 0, water: 0, fire: 2, earth: 0, aether: 0 };
    const { transmutedImprovements, heroAfterTransmutation } = transmuteElements(improvements, hero, "earth");

    expect(transmutedImprovements.earth).toBe(2);
    expect(transmutedImprovements.fire).toBe(0);
    expect(heroAfterTransmutation.earth).toBe(68);
    expect(heroAfterTransmutation.fire).toBe(488);
  });

  it("Should improve EARTH by 2 and WATER by zero", () => {
    const improvements = { power: 0, "max health": 0, health: 0, air: 0, water: 2, fire: 0, earth: 0, aether: 0 };
    const { transmutedImprovements, heroAfterTransmutation } = transmuteElements(improvements, hero, "earth");
    expect(transmutedImprovements.earth).toBe(2);
    expect(transmutedImprovements.water).toBe(0);
    expect(heroAfterTransmutation.earth).toBe(68);
    expect(heroAfterTransmutation.water).toBe(0);
  });

  it("Should improve EARTH by 2 and AIR by zero", () => {
    const improvements = { power: 0, "max health": 0, health: 0, air: 2, water: 0, fire: 0, earth: 0, aether: 0 };
    const { transmutedImprovements, heroAfterTransmutation } = transmuteElements(improvements, hero, "earth");

    expect(transmutedImprovements.earth).toBe(2);
    expect(transmutedImprovements.air).toBe(0);
    expect(heroAfterTransmutation.earth).toBe(68);
    expect(heroAfterTransmutation.air).toBe(695);
  });

  it("Should improve EARTH by 2, just like if there were no transmutation active", () => {
    const improvements = { power: 0, "max health": 0, health: 0, air: 0, water: 0, fire: 0, earth: 2, aether: 0 };
    const { transmutedImprovements, heroAfterTransmutation } = transmuteElements(improvements, hero, "earth");

    expect(transmutedImprovements.earth).toBe(2);
    expect(heroAfterTransmutation.earth).toBe(68);
  });
});
