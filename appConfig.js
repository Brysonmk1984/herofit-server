const { testSpecificFoe, attackOfTheElements } = require('./game/specialEvents/specialEventList');

const appState = ['live','maintenance'];
const config = {
  mode : appState[1],
  //specialEvent : testSpecificFoe,


  globalMessage : [
    { type : 'info', persist : false, message : "HeroFit is down for Maintenance, it wont be long." }
  ],

  // RANKING PAGE
  AVATAR_COUNT_PER_PAGE : 20
};



module.exports = { config };