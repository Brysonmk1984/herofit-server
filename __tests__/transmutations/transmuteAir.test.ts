import avCalc from "../../src/game/upgrades/avCalc";
import { HeroWithTransmutations } from "../../src/types/BackendOnlyTypes";
import heroProfiles from "./heroProfiles.json";

describe('AIR TRANSMUTATION - All other elements to AIR', () =>{
  const { transmuteElements, determineNetTransmutedElementalValues } = avCalc();
  const hero = heroProfiles[1] as unknown as HeroWithTransmutations;
  

  it('Should improve AIR by 2 and EARTH by zero', () =>{
    const improvements = { power: 0, 'max health': 0, health: 0, air: 0, water: 0, fire: 0, earth: 2, aether: 0 };
    const { transmutedImprovements, heroAfterTransmutation } =  transmuteElements(improvements, hero, 'air');

    expect(transmutedImprovements.air).toBe(2);
    expect(transmutedImprovements.earth).toBe(0);
    // Expecting 32 since earthToWater,AirToWater, and fireToWater all are 10, so 10 * 3 = 30 plus 2 from this activity
    expect(heroAfterTransmutation.air).toBe(32);
    // Expecting 24 since hero's earth = 36, earthToWater = 10, -2 for this transmutation to air
    expect(heroAfterTransmutation.earth).toBe(24);
  });

  // it('Should improve AIR by 2 and AIR by zero', () =>{
  //   const improvements = { power: 0, 'max health': 0, health: 0, air: 2, water: 0, fire: 0, earth: 0, aether: 0 };
  //   const { transmutedImprovements, heroAfterTransmutation } =  transmuteElements(improvements, hero, 'air');

  //   expect(transmutedImprovements.air).toBe(2);
  //   expect(transmutedImprovements.water).toBe(0);
  //   expect(heroAfterTransmutation.air).toBe(32);
  //   expect(heroAfterTransmutation.water).toBe(695);
  // });

  // it('Should improve AIR by 2 and FIRE by zero', () =>{
  //   const improvements = { power: 0, 'max health': 0, health: 0, air: 0, water: 0, fire: 2, earth: 0, aether: 0 };
  //   const { transmutedImprovements, heroAfterTransmutation } =  transmuteElements(improvements, hero, 'air');

  //   expect(transmutedImprovements.air).toBe(2);
  //   expect(transmutedImprovements.fire).toBe(0);
  //   expect(heroAfterTransmutation.air).toBe(32);
  //   expect(heroAfterTransmutation.fire).toBe(515);
  // });

  // it('Should improve AIR by 2, just like if there were no transmutation active', () =>{
  //   const improvements = { power: 0, 'max health': 0, health: 0, air: 0, water: 2, fire: 0, earth: 0, aether: 0 };
  //   const { transmutedImprovements, heroAfterTransmutation } =  transmuteElements(improvements, hero, 'air');

  //   expect(transmutedImprovements.air).toBe(2);
  //   // Expecting 32 since earthToWater,AirToWater, and fireToWater all are 10, plus 2 from this activity
  //   expect(heroAfterTransmutation.air).toBe(32);

  // });
});