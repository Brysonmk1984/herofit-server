const { testSpecificFoe, appWelcome } = require('./game/specialEvents/specialEventList');

const appState = ['live','maintenance'];
const config = {
  mode : appState[0],
  specialEvent : appWelcome,

  globalMessage : [
    { type : 'info', persist : false, message : "Did somebody ask for METRIC mode? You can now access it through the settings page :) Please report any bugs." },
    //{ type : 'info', persist : false, message : "You can now donate CAKE :)", persist : true }
  ],
};

module.exports = { config };