import avCalc from "../../src/game/upgrades/avCalc";
import { HeroWithTransmutations } from "../../src/types/BackendOnlyTypes";
import heroProfiles from "./heroProfiles.json";

describe('WATER TRANSMUTATION - All other elements to WATER', () =>{
  const { transmuteElements, determineNetTransmutedElementalValues } = avCalc();
  // Heroes aren't identical to how they are when saved in DB. These hero mocks represent heroes who are midway through the upgrade process
  // They just had their user totals adjusted but have yet to have the elements adjusted to match their previous and current transmutations
  // So for instance, if 30 fire has been transmuted away previously, and this was a fire activity for 2, and we are transmuting to water, 
  // then the hero mock would need at least 32 fire which will be subtracted away.
  const hero = heroProfiles[0] as unknown as HeroWithTransmutations;
  

  it('Should improve WATER by 2 and EARTH by zero', () =>{
    const improvements = { power: 0, 'max health': 0, health: 0, air: 0, water: 0, fire: 0, earth: 2, aether: 0 };
    const { transmutedImprovements, heroAfterTransmutation } =  transmuteElements(improvements, hero, 'water');

    expect(transmutedImprovements.water).toBe(2);
    expect(transmutedImprovements.earth).toBe(0);
    // Expecting 32 since earthToWater,AirToWater, and fireToWater all are 10, so 10 * 3 = 30 plus 2 from this activity
    expect(heroAfterTransmutation.water).toBe(32);
    // Expecting 24 since hero's earth = 36, earthToWater = 10, -2 for this transmutation to water
    expect(heroAfterTransmutation.earth).toBe(24);
  });

  it('Should improve WATER by 2 and AIR by zero', () =>{
    const improvements = { power: 0, 'max health': 0, health: 0, air: 2, water: 0, fire: 0, earth: 0, aether: 0 };
    const { transmutedImprovements, heroAfterTransmutation } =  transmuteElements(improvements, hero, 'water');

    expect(transmutedImprovements.water).toBe(2);
    expect(transmutedImprovements.air).toBe(0);
    expect(heroAfterTransmutation.water).toBe(32);
    expect(heroAfterTransmutation.air).toBe(695);
  });

  it('Should improve WATER by 2 and FIRE by zero', () =>{
    const improvements = { power: 0, 'max health': 0, health: 0, air: 0, water: 0, fire: 2, earth: 0, aether: 0 };
    const { transmutedImprovements, heroAfterTransmutation } =  transmuteElements(improvements, hero, 'water');

    expect(transmutedImprovements.water).toBe(2);
    expect(transmutedImprovements.fire).toBe(0);
    expect(heroAfterTransmutation.water).toBe(32);
    expect(heroAfterTransmutation.fire).toBe(515);
  });

  it('Should improve WATER by 2, just like if there were no transmutation active', () =>{
    const improvements = { power: 0, 'max health': 0, health: 0, air: 0, water: 2, fire: 0, earth: 0, aether: 0 };
    const { transmutedImprovements, heroAfterTransmutation } =  transmuteElements(improvements, hero, 'water');

    expect(transmutedImprovements.water).toBe(2);
    // Expecting 32 since earthToWater,AirToWater, and fireToWater all are 10, plus 2 from this activity
    expect(heroAfterTransmutation.water).toBe(32);

  });
});