const { BASE_POWER, MINUTES_PER_POWER, MINUTES_PER_ELM, MINUTES_PER_ALL_ELM, TIME_AND_HALF_ACTIVITIES } = require('../constants');
const moment = require('moment');
const { cloneObj, adjustActivityMinutes } = require('../../helperFunctions');
const avatarList = require('../../heroList.json');

// PRIMARY FUNCTIONS FOR HANDLING AVATAR POWER AND ELEMENT ADJUSTMENTS
function avCalc(userTotals){
  
  return avReturn = {
    updatePower : function(){

      let activityMinutes = 0;
      for(const activityType in userTotals){
        if(userTotals[activityType]){
          const durationInMinutes = userTotals[activityType].duration / 60;
          // If activity is a time and a half extivity, adjust the minutes appropriatesly so the avatar gets the right amount of element
          activityMinutes += adjustActivityMinutes(durationInMinutes, activityType, TIME_AND_HALF_ACTIVITIES);
        }
      }
      // Currently, not tracking timeAndHalf exercises with a constant. Instead, using the adjustedActivity minutes above. Consider changing this in the future
      const effortHalfHours = Math.floor(activityMinutes / MINUTES_PER_POWER);

      // One extra power earned for every 30 minutes of workout
      const totalPower = BASE_POWER + effortHalfHours;
      return totalPower;
    },
    updateElements : function(character, qpSpent, dateOfCreation){

      // Need to calculate the default elms each time the avatar is buffed, otherwise it will reset the original values are not accounted for
      const avatarBasics = cloneObj(avatarList.find((av)=> {
        return character === av.character;
      }), true);
      //console.log('CB elms - ', avatarBasics.elms);
      const e = avReturn._determineAstrologyBonus(avatarBasics.elms, dateOfCreation);
      
      //console.log('CB elms AND astro bonus - ', e);
      // Loop over each activity saved in userTotals and do a fresh calculation of what the element values are
      // Then they get added to the defaultElement congifuration above
      for(const activityType in userTotals){
        let activityMinutes = userTotals[activityType] ? (userTotals[activityType].duration / 60) : 0;
        // If activity is a time and a half extivity, adjust the minutes appropriatesly so the avatar gets the right amount of element
        // Currently, not tracking timeAndHalf exercises with a constant. Instead, using the adjustedActivity minutes above. Consider changing this in the future
        let adjustedActivityMinutes = adjustActivityMinutes(activityMinutes, activityType, TIME_AND_HALF_ACTIVITIES);
        //console.log(`ACTIVITY MINS for ${activityType} = `, activityMinutes, 'adjusted - ', adjustedActivityMinutes);
        switch (activityType){
          case 'run':
          case 'crossfit':
          case 'stairStepper':
            e.fire += (adjustedActivityMinutes / MINUTES_PER_ELM);
            break;
          case 'hike':
          case 'ride':
          case 'weightTraining':
            e.earth += (adjustedActivityMinutes / MINUTES_PER_ELM);
            break;
          case 'walk':
          case 'elliptical':
          case 'yoga':
            e.air += (adjustedActivityMinutes / MINUTES_PER_ELM);
            break;
          case 'swim':
          case 'rowing':
          case 'standUpPaddling':
          case 'ski':
          case 'snowboard':
          case 'snowshoe':
            e.water += (adjustedActivityMinutes / MINUTES_PER_ELM);
            break;
          case 'workout':
            e.fire += (activityMinutes / MINUTES_PER_ALL_ELM);
            e.earth += (activityMinutes / MINUTES_PER_ALL_ELM);
            e.air += (activityMinutes / MINUTES_PER_ALL_ELM);
            e.water += (activityMinutes / MINUTES_PER_ALL_ELM);
            break;
          default:
            break;
        }
      }
      //console.log('E after activities - ', e);
      //console.log('qp spent on elms - ', qpSpent);
      // round the elements down to nearest hundreth and add back in the qp points spent on each element
      const updatedElms = {
        earth : parseFloat(e.earth.toFixed(2)) + qpSpent.qpEarth,
        air : parseFloat(e.air.toFixed(2)) + qpSpent.qpAir,
        fire : parseFloat(e.fire.toFixed(2)) + qpSpent.qpFire,
        water : parseFloat(e.water.toFixed(2)) + qpSpent.qpWater
      }
      //console.log('combined, updated elms - ', updatedElms);
      return updatedElms;
    },
    
    // ADDS 5 TO WHICHEVER ELEMENT OF THE SIGN OF THE SEASON WHEN ACCOUNT WAS CREATED
    _determineAstrologyBonus : function(defaultelms, dateOfCreation){
      const bonusElement = avReturn.determineAstrologySeason(dateOfCreation).element.toLowerCase();

      defaultelms[bonusElement] += 5;
      return defaultelms;
    },

    determineAstrologySeason : function(dateOfCreation = null){
      const date = dateOfCreation ? moment(dateOfCreation) : moment();
    
      const thisYear = date.year();
      const lastYear = date.year()-1;
      const nextYear = date.year()+1;

      switch(true){
        // Capricorn
        case (date.isAfter(`${lastYear}-12-31`) && date.isBefore(`${thisYear}-01-20`)) || (date.isAfter(`${thisYear}-12-21`) && date.isBefore(`${nextYear}-01-01`)) :
          return {sign : 'Capricorn', element : 'Earth'};
        // Aquarius
        case (date.isAfter(`${thisYear}-01-19`) && date.isBefore(`${thisYear}-02-19`)) :
          return  {sign : 'Aquarius', element : 'Air'};
        // Pisces
        case (date.isAfter(`${thisYear}-02-18`) && date.isBefore(`${thisYear}-03-21`)) :
          return  {sign : 'Pisces', element : 'Water'};
        // Aries
        case (date.isAfter(`${thisYear}-03-20`) && date.isBefore(`${thisYear}-04-20`)) :
          return {sign : 'Aries', element : 'Fire'};
        // Taurus
        case (date.isAfter(`${thisYear}-04-19`) && date.isBefore(`${thisYear}-05-21`)) :
          return  {sign : 'Taurus', element : 'Earth'};
        // Gemini
        case (date.isAfter(`${thisYear}-05-20`) && date.isBefore(`${thisYear}-06-21`)) :
          return  {sign : 'Gemini', element : 'Air'};
        // Cancer
        case (date.isAfter(`${thisYear}-06-20`) && date.isBefore(`${thisYear}-07-23`)) :
          return  {sign : 'Cancer', element : 'Water'};
        // Leo
        case (date.isAfter(`${thisYear}-07-22`) && date.isBefore(`${thisYear}-08-23`)) :
          return {sign : 'Leo', element : 'Fire'};
        // Virgo
        case (date.isAfter(`${thisYear}-08-22`) && date.isBefore(`${thisYear}-09-23`)) :
          return  {sign : 'Virgo', element : 'Earth'};
        // Libra
        case (date.isAfter(`${thisYear}-09-22`) && date.isBefore(`${thisYear}-10-23`)) :
          return  {sign : 'Libra', element : 'Air'};
        // Scorpio
        case (date.isAfter(`${thisYear}-10-22`) && date.isBefore(`${thisYear}-11-22`)) :
          return  {sign : 'Scorpio', element : 'Water'};
        // Sagittarius
        case (date.isAfter(`${thisYear}-11-21`) && date.isBefore(`${thisYear}-12-22`)) :
          return  {sign : 'Sagittarius', element : 'Fire'};
        default:
          return {sign : 'Capricorn', element : 'Earth'};
      }
    }


  }
}

module.exports = avCalc;