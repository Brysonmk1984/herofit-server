const {
  testSpecificFoe,
  appWelcome,
} = require("./game/specialEvents/specialEventList");

const appState = ["live", "maintenance"];
const config = {
  mode: appState[0],
  specialEvent: appWelcome,

  globalMessage: [
    //{ type : 'success', persist : false, message : "The HeroFit mobile app is available in the App & Play store! Try it out if you haven't already!" },
    //{ type : 'info', persist : false, message : "You can now donate CAKE :)", persist : true }
  ],
};

module.exports = { config };
