const { testSpecificFoe, appWelcome } = require("./game/specialEvents/specialEventList");

const appState = ["live", "maintenance"];
const config = {
  mode: appState[0],
  specialEvent: appWelcome,

  globalMessage: [
    // { type: "info", persist: false, message: "New to the Game? Click here for some helpful info in our reddit community", link: "https://www.reddit.com/r/herofit/comments/ry9i4d/for_the_newcomers_heres_a_few_tips_to_help_you/" },
    //{ type : 'info', persist : false, message : "You can now donate CAKE :)", persist : true }
  ],
};

module.exports = { config };
