const { testSpecificFoe, attackOfTheElements } = require('./game/specialEvents/specialEventList');

const appState = ['live','maintenance'];
const config = {
  mode : appState[0],
  specialEvent : attackOfTheElements,


  // globalMessage : [
  //   { type : 'info', link : null, persist : false, message : "Thanks for your feedback about the mobile app! Development is underway but don't worry, the web app will be around for a long time and more content is on the horizon!" }
  // ],

  // RANKING PAGE
  AVATAR_COUNT_PER_PAGE : 20
};



module.exports = { config };