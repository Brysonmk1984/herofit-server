const { testSpecificFoe, attackOfTheElements } = require('./game/specialEvents/specialEventList');

const appState = ['live','maintenance'];
const config = {
  mode : appState[0],
  specialEvent : attackOfTheElements,


  // globalMessage : [
  //   { type : 'info', link : 'http://localhost:3000/elemental-event#segmentHeaderWrap', persist : false, message : "Until Wednesday, bonus odds and rewards for beating the Hulking Aggro Crag (from earth activities)" }
  // ],

  // RANKING PAGE
  AVATAR_COUNT_PER_PAGE : 20
};



module.exports = { config };