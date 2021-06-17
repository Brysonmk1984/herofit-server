const { testSpecificFoe, attackOfTheElements } = require('./game/specialEvents/specialEventList');

const appState = ['live','maintenance'];
const config = {
  mode : appState[0],
  specialEvent : attackOfTheElements,


  globalMessage : [
    { type : 'info', link : '/elemental-event#percentTable', persist : false, message : "Thorns Damage and Vampiric Touch have been nerfed by 25%. Overall foe difficulty reduced slightly. Click here to see the updated values." }
  ],

  // RANKING PAGE
  AVATAR_COUNT_PER_PAGE : 20
};



module.exports = { config };