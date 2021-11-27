const { testSpecificFoe, appWelcome } = require('./game/specialEvents/specialEventList');

const appState = ['live','maintenance'];
const config = {
  mode : appState[0],
  specialEvent : appWelcome,

  // globalMessage : [
  //   { type : 'info', persist : false, message : "BIG News about HeroFit! Read all about it here.", link : "https://www.reddit.com/r/herofit/comments/qu0g0n/big_announcement_an_update_on_the_web_app/" }
  // ],
};

module.exports = { config };