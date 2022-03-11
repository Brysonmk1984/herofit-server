import moment from "moment";
import defaultTotals from "../../common/defaultTotals.json";
import { BackendUserTotals, UserTotals } from "../../types/BackendOnlyTypes";
import HF from "../../types/herofit";
import { ACTIVITY_MAP } from "../CONSTANTS";

// Only use userTotals data from the DB as parameter
function utCalc(userTotals: UserTotals) {
  const actMap = ACTIVITY_MAP;
  let ut = userTotals;
  const utReturn = {
    // Updates existing user totals from DB with data from the new activities passed in
    // Returns the updated userTotals
    update: function (activities: HF.Activity[]) {
      // loop over each new activity sent from client
      activities.forEach((activity, i) => {
        // Converts Strava formatted activity to camelCase;
        let a;
        //console.log(activity.type);
        if (actMap[activity.type]) {
          a = actMap[activity.type];
        } else {
          a = "workout";
        }

        if (ut[a] === null) {
          ut[a] = defaultTotals[a];
        }
        //console.log('UT - ', ut);
        //console.log('A! - ', a, ut[a]);
        // All activities track instance count, duration, and average heart rate
        ut[a] = {
          instance: ++ut[a].instance,
          duration: ut[a].duration + activity.duration,
        };
      });
      return ut;
    },
    initialUpdate: function (activities: HF.Activity[], accountDate: string) {
      const accountDateMoment = moment(accountDate);
      let actBeforeAccCounter = 0;
      let actsToInclude = [] as HF.Activity[];
      // loop over each new activity sent from client
      activities.forEach((activity, i) => {
        const activityDate = moment(activity.activityDate);
        // Load 5 that happened before Account creation
        if (activityDate.isBefore(accountDateMoment)) {
          if (actBeforeAccCounter < 5) {
            actsToInclude.push(activity);
            ++actBeforeAccCounter;
          }
        } else {
          // All activities after account creation are valid
          // This happends when a new user registers, but doesn't upgrade right away
          // They come back later with new activities. We want to count these new
          // Activities in addition to the 5 before they signed up
          actsToInclude.push(activity);
        }
      });
      utReturn.update(actsToInclude);
      return ut;
    },
    // used for onetime reset and sync function '/recalculate-user-totals' in user.js routes
    reset: function () {
      const newBlankUt = {};
      for (let act in ACTIVITY_MAP) {
        newBlankUt[ACTIVITY_MAP[act]] = null;
      }
      ut = newBlankUt;
      return ut;
    },
  };
  return utReturn;
}
export default utCalc;
