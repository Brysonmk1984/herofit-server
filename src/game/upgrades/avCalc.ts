import { BASE_POWER, BASE_HEALTH, MINUTES_PER_ELM, MINUTES_PER_ALL_ELM, TIME_AND_HALF_ACTIVITIES, MAX_LEVEL } from "../CONSTANTS";
import moment from "moment";
import { cloneObj, adjustActivityMinutes } from "../../lib/helperFunctions";
import avatarList from "../../heroList.json";
import { QpSpentStats, UserTotals } from "../../types/BackendOnlyTypes";
import HF from "../../types/herofit";

interface ElementObject {
  fire: number;
  water: number;
  air: number;
  earth: number;
}

// PRIMARY FUNCTIONS FOR HANDLING AVATAR POWER AND ELEMENT ADJUSTMENTS
function avCalc(userTotals?: UserTotals) {
  const avReturn = {
    updatePower: function (level: number, qpPower: number) {
      // 5 Power per level, plus base, plus how much QP has been spent
      const totalPower = (level - 1) * 5 + qpPower + BASE_POWER;
      return totalPower;
    },
    updateAether: function (totalLevel: number, qpAether: number) {
      if (totalLevel <= MAX_LEVEL) {
        return 0;
      }
      const albedoLevel = totalLevel - MAX_LEVEL;
      // 5 Aether per level per Albedo level, plus how much QP has been spent
      // Don't need to -1 here since we're not starting at zero, but continuing on after 100
      const totalAether = albedoLevel * 5 + qpAether;
      return totalAether;
    },
    updateHealth: function (level: number, qpHealth: number, oldHealth: number, oldMaxHealth: number, oldStatus: HF.HeroStatus, lvlUp: boolean, reset?: boolean) {
      let updatedHealth = oldHealth;
      let updatedMaxHealth = oldMaxHealth;

      if (lvlUp) {
        // 5 Power per level, plus base, plus how much QP has been spent
        updatedMaxHealth = (level - 1) * 5 + qpHealth + BASE_HEALTH;

        switch (oldStatus) {
          case "Knocked Out":
            updatedHealth = 1;
            break;
          case "Infected":
            updatedHealth = oldHealth;
            break;
          case "Recovering":
          case "Rested":
            updatedHealth = updatedMaxHealth;
            break;
          default:
            break;
        }
      } else if (reset) {
        // Qp health will always be zero on reset
        updatedMaxHealth = (level - 1) * 5 + BASE_HEALTH;
        updatedHealth = updatedMaxHealth;
      }

      return {
        updatedHealth,
        updatedMaxHealth,
      };
    },
    updateElements: function (character: HF.CharacterName, qpSpent: QpSpentStats, dateOfCreation: string) {
      // Need to calculate the default elms each time the avatar is buffed, otherwise it will reset the original values are not accounted for
      const avatarBasics = cloneObj(
        avatarList.find(av => {
          return character === av.character;
        }),
        true,
      );
      const e = avReturn._determineAstrologyBonus(avatarBasics.elms, dateOfCreation);

      // Loop over each activity saved in userTotals and do a fresh calculation of what the element values are
      // Then they get added to the defaultElement configuration above
      for (const activityType in userTotals) {
        let activityMinutes = userTotals[activityType as keyof UserTotals] ? userTotals[activityType as keyof UserTotals].duration / 60 : 0;
        // If activity is a time and a half activity, adjust the minutes appropriately so the avatar gets the right amount of element
        // Currently, not tracking timeAndHalf exercises with a constant. Instead, using the adjustedActivity minutes above. Consider changing this in the future
        let adjustedActivityMinutes = adjustActivityMinutes(activityMinutes, activityType, TIME_AND_HALF_ACTIVITIES);
        //console.log(`ACTIVITY MINS for ${activityType} = `, activityMinutes, 'adjusted - ', adjustedActivityMinutes);
        switch (activityType) {
          case "run":
          case "crossfit":
          case "stairStepper":
            e.fire += adjustedActivityMinutes / MINUTES_PER_ELM;
            break;
          case "hike":
          case "ride":
          case "weightTraining":
            e.earth += adjustedActivityMinutes / MINUTES_PER_ELM;
            break;
          case "walk":
          case "elliptical":
          case "yoga":
            e.air += adjustedActivityMinutes / MINUTES_PER_ELM;
            break;
          case "swim":
          case "rowing":
          case "standUpPaddling":
          case "ski":
          case "snowboard":
          case "snowshoe":
          case "kayaking":
            e.water += adjustedActivityMinutes / MINUTES_PER_ELM;
            break;
          case "workout":
            e.fire += activityMinutes / MINUTES_PER_ALL_ELM;
            e.earth += activityMinutes / MINUTES_PER_ALL_ELM;
            e.air += activityMinutes / MINUTES_PER_ALL_ELM;
            e.water += activityMinutes / MINUTES_PER_ALL_ELM;
            break;
          default:
            break;
        }
      }

      // round the elements down to nearest hundreth and add back in the qp points spent on each element
      const updatedElms: ElementObject = {
        earth: parseFloat(e.earth.toFixed(2)) + qpSpent.qpEarth,
        air: parseFloat(e.air.toFixed(2)) + qpSpent.qpAir,
        fire: parseFloat(e.fire.toFixed(2)) + qpSpent.qpFire,
        water: parseFloat(e.water.toFixed(2)) + qpSpent.qpWater,
      };

      return updatedElms;
    },
    updateStatus: function (oldStatus: HF.HeroStatus, lvlUp: boolean) {
      if (lvlUp) {
        switch (oldStatus) {
          case "Knocked Out":
            return "Recovering";
          case "Infected":
            return "Recovering";
          case "Recovering":
            return "Rested";
          default:
            return oldStatus;
        }
      }

      return oldStatus;
    },

    // ADDS 5 TO WHICHEVER ELEMENT OF THE SIGN OF THE SEASON WHEN ACCOUNT WAS CREATED
    _determineAstrologyBonus: function (defaultElms: ElementObject, dateOfCreation: string) {
      const bonusElement = avReturn.determineAstrologySeason(dateOfCreation).element.toLowerCase() as Lowercase<HF.PrimaryElement>;

      defaultElms[bonusElement] += 5;
      return defaultElms;
    },

    // TODO: When refactoring to TS, make sure to return type of element is HF.PrimaryElement
    determineAstrologySeason: function (dateOfCreation: string = null): { sign: string; element: "Fire" | "Water" | "Air" | "Earth" } {
      const date = dateOfCreation ? moment(dateOfCreation) : moment();

      const thisYear = date.year();
      const lastYear = date.year() - 1;
      const nextYear = date.year() + 1;

      switch (true) {
        // Capricorn
        case (date.isAfter(`${lastYear}-12-31`) && date.isBefore(`${thisYear}-01-20`)) || (date.isAfter(`${thisYear}-12-21`) && date.isBefore(`${nextYear}-01-01`)):
          return { sign: "Capricorn", element: "Earth" };
        // Aquarius
        case date.isAfter(`${thisYear}-01-19`) && date.isBefore(`${thisYear}-02-19`):
          return { sign: "Aquarius", element: "Air" };
        // Pisces
        case date.isAfter(`${thisYear}-02-18`) && date.isBefore(`${thisYear}-03-21`):
          return { sign: "Pisces", element: "Water" };
        // Aries
        case date.isAfter(`${thisYear}-03-20`) && date.isBefore(`${thisYear}-04-20`):
          return { sign: "Aries", element: "Fire" };
        // Taurus
        case date.isAfter(`${thisYear}-04-19`) && date.isBefore(`${thisYear}-05-21`):
          return { sign: "Taurus", element: "Earth" };
        // Gemini
        case date.isAfter(`${thisYear}-05-20`) && date.isBefore(`${thisYear}-06-21`):
          return { sign: "Gemini", element: "Air" };
        // Cancer
        case date.isAfter(`${thisYear}-06-20`) && date.isBefore(`${thisYear}-07-23`):
          return { sign: "Cancer", element: "Water" };
        // Leo
        case date.isAfter(`${thisYear}-07-22`) && date.isBefore(`${thisYear}-08-23`):
          return { sign: "Leo", element: "Fire" };
        // Virgo
        case date.isAfter(`${thisYear}-08-22`) && date.isBefore(`${thisYear}-09-23`):
          return { sign: "Virgo", element: "Earth" };
        // Libra
        case date.isAfter(`${thisYear}-09-22`) && date.isBefore(`${thisYear}-10-23`):
          return { sign: "Libra", element: "Air" };
        // Scorpio
        case date.isAfter(`${thisYear}-10-22`) && date.isBefore(`${thisYear}-11-22`):
          return { sign: "Scorpio", element: "Water" };
        // Sagittarius
        case date.isAfter(`${thisYear}-11-21`) && date.isBefore(`${thisYear}-12-22`):
          return { sign: "Sagittarius", element: "Fire" };
        default:
          return { sign: "Capricorn", element: "Earth" };
      }
    },
  };
  return avReturn;
}
module.exports = avCalc;
export default avCalc;
