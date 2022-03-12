import moment from "moment";
import defaultTotals from "../../common/defaultTotals.json";
import { BackendActivity, UserTotals } from "../../types/BackendOnlyTypes";
import { ACTIVITY_MAP } from "../CONSTANTS";

// Only use userTotals data from the DB as parameter
function utCalc(userTotals: UserTotals) {
  const actMap = ACTIVITY_MAP;
  let ut = userTotals;
  const utReturn = {
    // Updates existing user totals from DB with data from the new activities passed in
    // Returns the updated userTotals
    update: function (activities: BackendActivity[]) {
      // loop over each new activity sent from client
      activities.forEach((activity, i) => {
        // Converts Strava formatted activity to camelCase;
        let a = actMap[activity.type] ? actMap[activity.type] : "workout";

        if (ut[a] === null) {
          ut[a] = defaultTotals[a];
        }
        // All activities track instance count, duration, and average heart rate
        ut[a] = {
          instance: ++ut[a].instance,
          duration: ut[a].duration + activity.duration,
        };
      });
      return ut;
    },
    initialUpdate: function (activities: BackendActivity[], accountDate: string) {
      const accountDateMoment = moment(accountDate);
      let actBeforeAccCounter = 0;
      let actsToInclude = [] as BackendActivity[];
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
          // This happens when a new user registers, but doesn't upgrade right away
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
      const newBlankUt = {} as UserTotals;
      let act: keyof typeof actMap;
      for (act in actMap) {
        newBlankUt[actMap[act]] = null;
      }
      ut = newBlankUt;
      return ut;
    },
  };
  return utReturn;
}
export default utCalc;
