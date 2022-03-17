import { FOE_NON_ACTION } from "../CONSTANTS";
import Chance from "chance";
import xpCalc from "../upgrades/xpCalc";
import { scrambleStats } from "../../lib/helperFunctions";
import { BackendEffectProcs, BattleFoe, BattleHero, PassiveAbility, Scenario } from "../../types/BackendOnlyTypes";
import HF from "../../types/herofit";
const chance = Chance();

function doAvatarBattlePrep(avatar: BattleHero, foe: BattleFoe, effects: string[], scenario: number) {
  const eAvatar = { ...avatar };
  let eFoe = { ...foe };
  const effectProcs: BackendEffectProcs[] = [];
  effects.forEach(effect => {
    switch (effect) {
      case "Hero +5,+10% Water":
        eAvatar.water += 5;
        eAvatar.water += Math.floor(eAvatar.water * 0.1);
        effectProcs.push({
          effect: "Hero +5,+10% Water",
          heroStatsEffected: ["water"],
        });
        break;
      case "Hero +5,+10% Air":
        eAvatar.air += 5;
        eAvatar.air += Math.floor(eAvatar.air * 0.1);
        effectProcs.push({
          effect: "Hero +5,+10% Air",
          heroStatsEffected: ["air"],
        });
        break;
      case "Hero +5,+10% Earth":
        eAvatar.earth += 5;
        eAvatar.earth += Math.floor(eAvatar.earth * 0.1);
        effectProcs.push({
          effect: "Hero +5,+10% Earth",
          heroStatsEffected: ["earth"],
        });
        break;
      case "Hero +5,+10% Fire":
        eAvatar.fire += 5;
        eAvatar.fire += Math.floor(eAvatar.fire * 0.1);
        effectProcs.push({
          effect: "Hero +5,+10% Fire",
          heroStatsEffected: ["fire"],
        });
        break;
      case "Hero +10 Health":
        eAvatar.health += 10;
        effectProcs.push({
          effect: "Hero +10 Health",
          heroStatsEffected: ["health"],
        });
        break;
      case "Hero +10,+15% Power":
        eAvatar.power += 10;
        eAvatar.power += Math.floor(eAvatar.power * 0.15);
        effectProcs.push({
          effect: "Hero +10,+15% Power",
          heroStatsEffected: ["power"],
        });
        break;
      case "Hero +10 Armor":
        eAvatar.armor += 10;
        effectProcs.push({
          effect: "Hero +10 Armor",
          heroStatsEffected: ["armor"],
        });
        break;
      case "Hero +15 Power":
        eAvatar.power += 15;
        effectProcs.push({
          effect: "Hero +15 Power",
          heroStatsEffected: ["power"],
        });
        break;
      case "Hero +15 Aether":
        eAvatar.aether += 15;
        effectProcs.push({
          effect: "Hero +15 Aether",
          heroStatsEffected: ["aether"],
        });
        break;
      case "Hero +25% Health":
        eAvatar.health += Math.floor(eAvatar.health * 0.25);
        effectProcs.push({
          effect: "Hero +25% Health",
          heroStatsEffected: ["health"],
        });
        break;
      case "Hero +33% Fire":
        eAvatar.fire += Math.floor(eAvatar.fire * 0.33);
        effectProcs.push({
          effect: "Hero +33% Fire",
          heroStatsEffected: ["fire"],
        });
        break;
      case "Hero +25,+25% Air":
        eAvatar.air += 25;
        eAvatar.air += Math.floor(eAvatar.air * 0.25);
        effectProcs.push({
          effect: "Hero +25,+25% Air",
          heroStatsEffected: ["air"],
        });
        break;
      case "Hero +25,+25% Earth":
        eAvatar.earth += 25;
        eAvatar.earth += Math.floor(eAvatar.earth * 0.25);
        effectProcs.push({
          effect: "Hero +25,+25% Earth",
          heroStatsEffected: ["earth"],
        });
        break;
      case "Hero +25,+25% Fire":
        eAvatar.fire += 25;
        eAvatar.fire += Math.floor(eAvatar.fire * 0.25);
        effectProcs.push({
          effect: "Hero +25,+25% Fire",
          heroStatsEffected: ["fire"],
        });
        break;
      case "Hero +25,+25% Water":
        eAvatar.water += 25;
        eAvatar.water += Math.floor(eAvatar.water * 0.25);
        effectProcs.push({
          effect: "Hero +25,+25% Water",
          heroStatsEffected: ["water"],
        });
        break;
      case "Hero +5% All Elements":
        eAvatar.fire += Math.floor(eAvatar.fire * 0.05);
        eAvatar.earth += Math.floor(eAvatar.earth * 0.05);
        eAvatar.water += Math.floor(eAvatar.water * 0.05);
        eAvatar.air += Math.floor(eAvatar.air * 0.05);
        eAvatar.aether += Math.floor(eAvatar.aether * 0.05);
        effectProcs.push({
          effect: "Hero +5% All Elements",
          heroStatsEffected: ["fire", "earth", "water", "air", "aether"],
        });
        break;
      case "Hero +10% All Elements":
        eAvatar.fire += Math.floor(eAvatar.fire * 0.1);
        eAvatar.earth += Math.floor(eAvatar.earth * 0.1);
        eAvatar.water += Math.floor(eAvatar.water * 0.1);
        eAvatar.air += Math.floor(eAvatar.air * 0.1);
        eAvatar.aether += Math.floor(eAvatar.aether * 0.1);
        effectProcs.push({
          effect: "Hero +10% All Elements",
          heroStatsEffected: ["fire", "earth", "water", "air", "aether"],
        });
        break;
      case "Foe -10|-3% Health":
      case "Foe -10|3% Health":
        const threePercentHealth = Math.floor(eFoe.health * 0.03);
        eFoe.health -= threePercentHealth > 10 ? threePercentHealth : 10;
        effectProcs.push({
          effect: "Foe -10|-3% Health",
          foeStatsEffected: ["health"],
        });
        break;
      case "Foe -35|-5% Health":
        const fivePercentHealth = Math.floor(eFoe.health * 0.05);
        eFoe.health -= fivePercentHealth > 35 ? fivePercentHealth : 35;
        effectProcs.push({
          effect: "Foe -35|-5% Health",
          foeStatsEffected: ["health"],
        });
        break;
      case "Foe -10% Health":
        eFoe.health -= Math.floor(eFoe.health * 0.1);
        effectProcs.push({
          effect: "Foe -10% Health",
          foeStatsEffected: ["health"],
        });
        break;
      case "Ill Omen":
        const isNegativeScenario = scenario.id === 1 || scenario.id === 3 ? true : false;
        let illOmenProc = eFoe.difficultyLevel === "high" ? true : false;

        if (eFoe.difficultyLevel === "medium") {
          if (eFoe.difficulty >= 0.08 || isNegativeScenario) {
            illOmenProc = true;
          }
        }

        if (illOmenProc) {
          eAvatar.health = Math.floor(eAvatar.health * 1.25);
          eAvatar.air = Math.floor(eAvatar.air * 1.25);
          effectProcs.push({
            effect: "Ill Omen",
            heroStatsEffected: ["health", "air"],
          });
        }

        break;
      case "Bad Luck":
        const badLuckProc = chance.bool({ likelihood: 25 });

        // If badluck effect happens, randomly reduce a non-zero foe stat to 50%
        if (badLuckProc) {
          const possibleStats = ["power", "armor", "health", "water", "air", "fire", "earth"];
          const foeStatArr = [];

          for (let stat in eFoe) {
            if (possibleStats.includes(stat)) {
              if (eFoe[stat] > 0) {
                foeStatArr.push(stat);
              }
            }
          }

          const statToReduce = foeStatArr[Math.floor(Math.random() * foeStatArr.length)];
          eFoe[statToReduce] = Math.floor(foe[statToReduce] * 0.5);
          effectProcs.push({
            effect: "Bad Luck",
            foeStatsEffected: [eFoe[statToReduce]],
          });
        }
        break;
      case "Lethal Surprise":
        const lethalSurpriseProc = chance.bool({ likelihood: 3 });
        if (lethalSurpriseProc) {
          eFoe.health = 1;
          effectProcs.push({
            effect: "Lethal Surprise",
            foeStatsEffected: ["health"],
          });
        }
        break;
      case "Eight-Legged Ingenuity":
        const ingenuityProc = chance.bool({ likelihood: 33 });
        if (ingenuityProc) {
          const possibleStats = ["power", "armor", "health", "water", "air", "fire", "earth"];
          eFoe = { ...scrambleStats(possibleStats, foe) };
          effectProcs.push({
            effect: "Eight-Legged Ingenuity",
            foeStatsEffected: ["power", "armor", "health", "water", "air", "fire", "earth"],
          });
        }
        break;
      case "Frisky Mischief":
        const friskyProc = chance.bool({ likelihood: 75 });
        if (friskyProc) {
          const possibleStats = ["power", "armor", "health", "water", "air", "fire", "earth"];
          const mappedToOb = possibleStats
            .filter(stat => avatar[stat] > 0)
            .map(stat => {
              return { [stat]: avatar[stat] || 0 };
            });

          // Only return the lowest value
          const lowestAvVal = mappedToOb.reduce((m, k) => {
            return Math.min(m, avatar[Object.keys(k)[0]]);
          }, Infinity);

          // Finds the property of that value
          let avStatObj = mappedToOb.find(obj => {
            //console.log('look', Object.keys(obj), Object.keys(obj)[0]);
            const currentKey = Object.keys(obj)[0];
            if (obj[currentKey] === lowestAvVal) {
              //console.log('in lowest match', lowestAvVal);
              return Object.keys(lowestAvVal);
            }
          });

          // Can't figure out why
          if (!avStatObj) {
            //console.log('avStatObj is undefined or null for some reason', avStatObj);
            break;
          }
          // THIS IS WHERE IT FAILED (BELOW)
          const avStat = Object.keys(avStatObj)[0];
          const avStatValue = Object.values(avStatObj)[0];
          const foeStatVal = foe[avStat];
          if (foeStatVal > avStatValue) {
            eAvatar[avStat] = foeStatVal;
            eFoe[avStat] = lowestAvVal;
          }

          effectProcs.push({
            effect: "Frisky Mischief",
            heroStatsEffected: [avStat],
            foeStatsEffected: [avStat],
          });
        }
        break;
      case "Rabbit Tactics":
        const { getCurrentLevel } = xpCalc(avatar.activityXP, avatar.battleXP);
        const { total: avatarLevel } = getCurrentLevel();
        eAvatar.armor = Math.floor(avatar.armor * 0.33);
        const conversionBonus = avatar.armor * 0.66;

        const naturalLogOfLevel = Math.log(avatarLevel);
        const RABBIT_TACTICS_MODIFIER = (naturalLogOfLevel * avatarLevel) / 10;

        // Potentially infinite for low level heroes, need to check for infinity
        const powerBeforeFiniteCheck = Math.floor(eAvatar.power + (conversionBonus * avatarLevel) / RABBIT_TACTICS_MODIFIER);
        eAvatar.power = isFinite(powerBeforeFiniteCheck) ? powerBeforeFiniteCheck : eAvatar.power;

        // Potentially infinite for low level heroes, need to check for infinity
        const airBeforeFiniteCheck = Math.floor(eAvatar.air + (conversionBonus * avatarLevel) / RABBIT_TACTICS_MODIFIER);
        eAvatar.air = isFinite(airBeforeFiniteCheck) ? airBeforeFiniteCheck : eAvatar.air;

        effectProcs.push({
          effect: "Rabbit Tactics",
          heroStatsEffected: ["armor", "power", "air"],
        });

      default:
        break;
    }
  });

  return { avatar: eAvatar, foe: eFoe, procs: effectProcs };
}

function doFoeBattlePrep(avatar: BattleHero, foe: BattleFoe, scenarioId: number) {
  const ability = foe.ability;
  const effectProcs: BackendEffectProcs[] = [];
  if (ability && ability.type === "prebattle") {
    if (scenarioId !== FOE_NON_ACTION) {
      let fAvatar = { ...avatar };
      let fFoe = { ...foe };
      switch (ability.name) {
        case "From the Shadows":
          // Increased Power
          fFoe.power = Math.floor(foe.power + foe.power * 0.35);
          effectProcs.push({
            effect: "From the Shadows",
            foeStatsEffected: ["power"],
          });
          break;
        case "Intimidation":
          // Power Reduction
          fAvatar.power = Math.floor(avatar.power - avatar.power * 0.5);
          effectProcs.push({
            effect: "Intimidation",
            heroStatsEffected: ["power"],
          });
          break;
        case "Paranormal Pandemonium":
          // Stat Scramble
          const stats: Partial<Lowercase<HF.Stat>>[] = ["armor", "earth", "fire", "water", "air", "power", "health"];

          fAvatar = { ...scrambleStats(stats, avatar) } as BattleHero;
          effectProcs.push({
            effect: "Paranormal Pandemonium",
            heroStatsEffected: ["armor", "earth", "fire", "water", "air", "power", "health"],
          });
          break;
        case "Unholy Armor":
          const foeArmor = foe.armor;
          const foeHealth = foe.health;
          // Unholy Armor
          // Bonus to Armor & Health
          fFoe.armor = Math.floor(foeArmor + foeArmor * 0.33);
          fFoe.health = Math.floor(foeHealth + foeHealth * 0.1);
          effectProcs.push({
            effect: "Unholy Armor",
            foeStatsEffected: ["health", "armor"],
          });
          break;
        case "Can't Hide from Me":
          // Armor Break
          fAvatar.armor = 0;
          effectProcs.push({
            effect: "Can't Hide from Me",
            heroStatsEffected: ["armor"],
          });
          break;
        case "Shadowy Influx":
          // Health Bonus
          fFoe.health = Math.floor(foe.health + foe.health * 0.2);
          effectProcs.push({
            effect: "Shadowy Influx",
            foeStatsEffected: ["health"],
          });
          break;
        case "Breath Bane":
          // Health Reduction
          fAvatar.health = Math.floor(avatar.health - avatar.health * 0.2);
          effectProcs.push({
            effect: "Breath Bane",
            heroStatsEffected: ["health"],
          });
          break;
        case "Sadistic Siphon":
          // Health Steal
          const avatarHealth = avatar.health;
          const stolenHealth = avatarHealth * 0.166;

          fFoe.health = Math.floor(foe.health + stolenHealth);
          fAvatar.health = Math.floor(avatar.health - stolenHealth);
          effectProcs.push({
            effect: "Sadistic Siphon",
            heroStatsEffected: ["health"],
            foeStatsEffected: ["health"],
          });
          break;
        default:
          break;
      }

      return { avatar: fAvatar, foe: fFoe, procs: effectProcs };
    }
  }

  return { avatar, foe, procs: effectProcs };
}

function doHeroPassiveAbilities(avatar: BattleHero, possibleAbilityProcs: string[], effectProcs: BackendEffectProcs[], passiveAbility: PassiveAbility) {
  const eAvatar = { ...avatar };
  const { type, name } = passiveAbility;
  const pAbilityProcs = [...possibleAbilityProcs];
  const eProcs = [...effectProcs];
  // Only consider abilities that are prebattle
  if (type === "prebattle") {
    switch (name) {
      case "Naturally Stealthy":
        pAbilityProcs.push("Naturally Stealthy");
        break;
      case "Healing Waters":
        // Adjust Hero's water amount based on their health
        const healingWatersBonus = Math.floor(avatar.health / 6);
        const newWaterAmount = avatar.water + healingWatersBonus;
        eAvatar.water = newWaterAmount;

        // Add to eProcs(effectProcs) array since it always procs
        eProcs.push({
          effect: "Healing Waters",
          heroStatsEffected: ["water"],
          type: "prebattle",
        });
        break;
      default:
        break;
    }
  } else if (type === "battle") {
    switch (name) {
      case "Corundum-Clast Armor":
        eProcs.push({
          effect: "CC Armor",
          heroStatsEffected: ["armor"],
          type: "battle",
        });
        break;
      case "Olfactory Overload":
        eProcs.push({
          effect: "Olfactory Overload",
          type: "battle",
        });
      default:
        break;
    }
  } else if (type === "postbattle") {
    switch (name) {
      case "Auxiliary Systems":
        pAbilityProcs.push("Auxiliary Systems");
        break;
      case "Rewrite History":
        pAbilityProcs.push("Rewrite History");
        break;
      default:
        break;
    }
  }

  return {
    avatar: eAvatar,
    pAbilityProcs,
    eProcs,
  };
}

export { doAvatarBattlePrep, doFoeBattlePrep, doHeroPassiveAbilities };
