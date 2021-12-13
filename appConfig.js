const { testSpecificFoe, appWelcome } = require('./game/specialEvents/specialEventList');

const appState = ['live','maintenance'];
const config = {
  mode : appState[0],
  specialEvent : appWelcome,

  globalMessage : [
    { type : 'info', persist : false, message : "You can now donate on herofitgame.com if you're feeling generous :)", link : "https://herofitgame.com" }
  ],
};

module.exports = { config };