const { testSpecificFoe, attackOfTheElements } = require('./game/specialEvents/specialEventList');

const appState = ['live','maintenance'];
const config = {
  mode : appState[0],
  //specialEvent : attackOfTheElements,


  // globalMessage : [
  //   { type : 'info', link : '/elemental-event#socialSharingProfile', persist : false, message : "It's the final Week of The Elemental Event & the last chance to earn the 'Elemental Outrider' Title. Higher chance to receive the Wave-Swept Battle Conch until next Wednesday." }
  // ],

  // RANKING PAGE
  AVATAR_COUNT_PER_PAGE : 20
};



module.exports = { config };