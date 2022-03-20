import { determineFireCrit, determineAirEvade, determineWaterHeal, determineEarthThorns, determineTD } from "../../src/game/battle/elementalProcs";
import { FIRE_CRIT_CHANCE_MOD, WATER_HEAL_MOD, AIR_EVASION_CHANCE_MOD, EARTH_THORNS_MOD, AETHER_TD_CHANCE_MOD } from "../../src/game/CONSTANTS";
import Chance from "chance";

describe("Elemental Traits for Battles", () => {
  describe("Fire Trait", () => {
    it("No fire element power should return zero chance/zero damage", () => {
      const { critChance, critDamage } = determineFireCrit(0, 500);
      expect(critChance).toBe(0);
      expect(critDamage).toBe(0);
    });

    it("200 fire elemental power should return 27% chance/ 0 | 231 damage", () => {
      const { critChance, critDamage } = determineFireCrit(200, 500);
      expect(critChance).toBe(27);
      expect(critDamage).toBeOneOf([231, 0]);
    });
  });

  describe("Air Trait", () => {
    it("No air element power should return true | false", () => {
      const { evaded } = determineAirEvade(0);
      expect(evaded).toEqual(expect.any(Boolean));
    });

    it("200 air elemental power should return true | false", () => {
      const { evaded } = determineAirEvade(200);
      expect(evaded).toEqual(expect.any(Boolean));
    });
  });

  describe("Water Trait", () => {
    it("No water element power should return zero factor/zero healed", () => {
      const { healingFactor, amountHealed } = determineWaterHeal(0, 500);

      expect(healingFactor).toBe(0);
      expect(amountHealed).toBe(0);
    });

    it("200 water elemental power should return 27% chance/ 0 | 231 damage", () => {
      const { healingFactor, amountHealed } = determineWaterHeal(200, 500);

      expect(healingFactor).toBe(0.17);
      expect(amountHealed).toBe(85);
    });
  });

  describe("Earth Trait", () => {
    it("No earth element power should return zero factor/zero damage", () => {
      const { thornsFactor, thornsDamageToAttacker } = determineEarthThorns(0, 500);
      console.log({ thornsFactor, thornsDamageToAttacker });
      expect(thornsFactor).toBe(0);
      expect(thornsDamageToAttacker).toBe(0);
    });

    it("200 fire elemental power should return 15% chance / 0 | 75 damage", () => {
      const { thornsFactor, thornsDamageToAttacker } = determineEarthThorns(200, 500);

      expect(thornsFactor).toBe(0.15);
      expect(thornsDamageToAttacker).toBe(75);
    });
  });

  describe("Aether Trait - Temporal Distortion", () => {
    it("No Aether element power should return false for effect proc & Foe should go first after effect", () => {
      const { td, gf } = determineTD(0, "Foe");
      expect(td).toBe(false);
      expect(gf).toBe("Foe");
    });

    it("200 Aether elemental power should return false | true for effect proc & Avatar should go first after effect", () => {
      const { td, gf } = determineTD(200, "Foe");
      expect(td).toBeOneOf([false, true]);
      expect(gf).toBeOneOf(["Avatar", "Foe"]);
    });
  });
});
