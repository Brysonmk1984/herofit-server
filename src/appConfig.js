const { testSpecificFoe, appWelcome } = require("./game/specialEvents/specialEventList");

const appState = ["live", "maintenance"];
const config = {
  mode: appState[0],
  specialEvent: appWelcome,

  globalMessage: [
    { type: "info", persist: false, message: "Refer a friend, earn a Phoenix! Learn more here.", link: "https://herofit.io/signup-rewards" },
    //{ type : 'info', persist : false, message : "You can now donate CAKE :)", persist : true }
  ],
};

module.exports = { config };
