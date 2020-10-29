//const defaultTotals = require('./defaultTotals');
const { ACTIVITY_MAP, COMPETITIVE_ACTIVITIES } = require('../constants');
const moment = require('moment');

// Only use userTotals data from the DB as parameter
const userTotals = function(userTotals){
  const actMap = ACTIVITY_MAP;
  const compActs = COMPETITIVE_ACTIVITIES;
  //const actMap = { 'Run' : 'run', 'Hike' : 'hike', 'Ride' : 'ride', 'Walk' : 'walk', 'StairStepper' : 'stairStepper', 'Elliptical' : 'elliptical', 'Swim' : 'swim', 'WeightTraining' : 'weightTraining', 'Yoga' : 'yoga', 'Rowing' : 'rowing', 'Crossfit' : 'crossfit', 'StandUpPaddling' : 'standUpPaddling', 'Workout' : 'workout' };
  //const compActs = ['run', 'hike', 'ride', 'walk']; 
  const ut = userTotals;
  const cachedThis = this;
  return utReturn = {
    // Updates existing user totals from DB with data from the new activities passed in
    // Returns the updated userTotals
    update : function(activities){
      
    // loop over each new activity sent from client
      activities.forEach((activity, i) =>{
        // Converts Strava formatted activity to camelCase;
        const a = actMap[activity.type];

        // All activities track instance count, duration, and average heart rate
        ut[a] = {
          instance : ++ut[a].instance,
          duration : ut[a].duration + activity.elapsed_time,
          avgHeartrate : (ut[a].avgHeartrate + activity.average_heartrate) / ut[a].instance
        }

        // The competitive activities also track distance, elevation gain, and speed in HF
        if(compActs.includes(a)){
          ut[a].distance = ut[a].distance + activity.distance;
          ut[a].elevationGain = ut[a].elevationGain + activity.total_elevation_gain;
          ut[a].avgSpeed = (ut[a].avgSpeed + activity.average_speed) / ut[a].instance;
        }

      });
      return ut;
    },
    initialUpdate : function(activities, accountDate){
      accountDate = moment(accountDate);
      let actBeforeAccCounter = 0;

      // loop over each new activity sent from client
      activities.forEach((activity, i) =>{
        const activityDate = moment(activity.start_date);
        // Load 10 that happened before Account creation 
        if(activityDate.isBefore(accountDate)){
          if(actBeforeAccCounter < 10){
          utReturn.update(activity);
            ++actBeforeAccCounter;
          }
        }else{
          // All activities after account creation are valid
          // This happends when a new user registers, but doesn't upgrade right away
          // They come back later with new activities. We want to count these new
          // Activities in addition to the 10 before they signed up
          utReturn.update([activity]);
        }
      });
      return ut;
    }
  }
}

module.exports = userTotals;