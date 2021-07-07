const { testSpecificFoe, attackOfTheElements } = require('./game/specialEvents/specialEventList');

const appState = ['live','maintenance'];
const config = {
  mode : appState[1],
  specialEvent : attackOfTheElements,


  globalMessage : [
    { type : 'info', link : 'https://old.reddit.com/r/herofit/comments/ofmont/housekeeping_minor_update/', persist : false, message : "New minor updates including connecting/disconnecting Strava account. Click here for details." }
  ],

  // RANKING PAGE
  AVATAR_COUNT_PER_PAGE : 20
};



module.exports = { config };