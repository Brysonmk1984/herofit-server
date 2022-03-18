import avatarProfiles from "../battles/heroProfiles.json";
import { determineScenario } from "../../src/game/battle/scenario";
import { doHeroPassiveAbilities } from "../../src/game/battle/doBattlePrep";
import HF from "../../src/types/herofit";
import { unitTestExporter } from "../../src/game/battle/doBattle";
import { BattleHero, PassiveAbility } from "../../src/types/BackendOnlyTypes";

describe("Passive Hero Abilities", () => {
  // NATURAL NINJA
  describe("Natural Ninja's ability", () => {
    const heroesOfType = avatarProfiles.filter(a => a.character === "Natural Ninja");
    const heroTemplate = heroesOfType[Math.floor(Math.random() * heroesOfType.length)];

    let scenario, effectProcs;
    let beginnersLuck = false;
    let possibleAbilityProcs = [];
    const passiveAbility = { name: "Naturally Stealthy", type: "prebattle" } as PassiveAbility;

    it("Should be added to possibleAbilityProcs - 'Naturally Stealthy' ", () => {
      const { avatar, pAbilityProcs, eProcs } = doHeroPassiveAbilities(heroTemplate as unknown as BattleHero, ["Naturally Stealthy"], [], passiveAbility);
      possibleAbilityProcs = possibleAbilityProcs.concat(pAbilityProcs);
      expect(pAbilityProcs).toEqual(expect.arrayContaining(["Naturally Stealthy"]));
    });

    it("Should boost chance to do battle scenario [0] - 'Naturally Stealthy'", () => {
      const scenarioZeroBoost = possibleAbilityProcs.includes("Naturally Stealthy") ? true : false;
      expect(scenarioZeroBoost).toBe(true);

      ({ s: scenario, ep: effectProcs } = determineScenario(beginnersLuck, scenarioZeroBoost, []));

      // Depending on if the ability happened, test different results
      if (!effectProcs.includes("Naturally Stealthy")) {
        expect(scenario.id).toBeOneOf([0, 1, 2, 3, 4, 5]);
      } else {
        expect(scenario.id).toBe(0);
        expect(effectProcs).toEqual(expect.arrayContaining(["Naturally Stealthy"]));
      }
    });
  });

  // EMPATH
  describe("Empath's ability", () => {
    const heroesOfType = avatarProfiles.filter(a => a.character === "Empath Aurelia");
    const heroTemplate = heroesOfType[Math.floor(Math.random() * heroesOfType.length)];

    it('Should be added to eProcs(effectProcs) - "Healing Waters"', () => {
      const passiveAbility = { name: "Healing Waters", type: "prebattle" } as PassiveAbility;
      const { avatar, pAbilityProcs, eProcs } = doHeroPassiveAbilities(heroTemplate as unknown as BattleHero, [], [], passiveAbility);

      expect(eProcs).toEqual(expect.arrayContaining([{ effect: "Healing Waters", heroStatsEffected: ["water"], type: "prebattle" }]));
      expect(avatar.water).toBe(heroTemplate.water + Math.floor(heroTemplate.health / 6));
    });
  });

  // BOULDER BRO
  describe("Boulder Bro's ability", () => {
    const placeholderPassive = { name: "not in use", aggressor: "foe" as const };
    const mockPassive = { name: "Corundum Armor", aggressor: "foe" as const };

    const { _calcArmorDR } = unitTestExporter();
    const withoutArmorPassive = _calcArmorDR(100, 5, placeholderPassive);
    const withArmorPassive = _calcArmorDR(100, 5, mockPassive);
    expect(withArmorPassive.netDamage).toBeLessThan(withoutArmorPassive.netDamage);
  });
});
