const { testSpecificFoe, appWelcome } = require('./game/specialEvents/specialEventList');

const appState = ['live','maintenance'];
const config = {
  mode : appState[0],
  specialEvent : appWelcome,

  globalMessage : [
    { type : 'info', persist : false, message : "Raven Has been buffed. See changes by clicking on the pet in your inventory" },
    //{ type : 'info', persist : false, message : "You can now donate CAKE :)", persist : true }
  ],
};

module.exports = { config };