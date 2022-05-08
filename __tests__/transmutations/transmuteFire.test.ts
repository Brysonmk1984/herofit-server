import avCalc from "../../src/game/upgrades/avCalc";
import { HeroWithTransmutations } from "../../src/types/BackendOnlyTypes";
import heroProfiles from "./heroProfiles.json";

describe('FIRE TRANSMUTATION - All other elements to FIRE', () =>{
  const { transmuteElements, determineNetTransmutedElementalValues } = avCalc();
  const hero = heroProfiles[2] as unknown as HeroWithTransmutations;
  

  it('Should improve FIRE by 2 and EARTH by zero', () =>{
    const improvements = { power: 0, 'max health': 0, health: 0, air: 0, water: 0, fire: 0, earth: 2, aether: 0 };
    const { transmutedImprovements, heroAfterTransmutation } =  transmuteElements(improvements, hero, 'fire');

    expect(transmutedImprovements.fire).toBe(2);
    expect(transmutedImprovements.earth).toBe(0);
    expect(heroAfterTransmutation.fire).toBe(532);
    expect(heroAfterTransmutation.earth).toBe(24);
  });

  it('Should improve FIRE by 2 and WATER by zero', () =>{
    const improvements = { power: 0, 'max health': 0, health: 0, air: 0, water: 2, fire: 0, earth: 0, aether: 0 };
    const { transmutedImprovements, heroAfterTransmutation } =  transmuteElements(improvements, hero, 'fire');
    expect(transmutedImprovements.fire).toBe(2);
    expect(transmutedImprovements.water).toBe(0);
    expect(heroAfterTransmutation.fire).toBe(532);
    expect(heroAfterTransmutation.water).toBe(0);
  });

  it('Should improve FIRE by 2 and AIR by zero', () =>{
    const improvements = { power: 0, 'max health': 0, health: 0, air: 2, water: 0, fire: 0, earth: 0, aether: 0 };
    const { transmutedImprovements, heroAfterTransmutation } =  transmuteElements(improvements, hero, 'fire');

    expect(transmutedImprovements.fire).toBe(2);
    expect(transmutedImprovements.air).toBe(0);
    expect(heroAfterTransmutation.fire).toBe(532);
    expect(heroAfterTransmutation.air).toBe(695);
  });

  it('Should improve FIRE by 2, just like if there were no transmutation active', () =>{
    const improvements = { power: 0, 'max health': 0, health: 0, air: 0, water: 0, fire: 2, earth: 0, aether: 0 };
    const { transmutedImprovements, heroAfterTransmutation } =  transmuteElements(improvements, hero, 'fire');

    expect(transmutedImprovements.fire).toBe(2);
    expect(heroAfterTransmutation.fire).toBe(532);

  });
});