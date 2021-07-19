const { testSpecificFoe, attackOfTheElements } = require('./game/specialEvents/specialEventList');

const appState = ['live','maintenance'];
const config = {
  mode : appState[0],
  specialEvent : attackOfTheElements,


  // globalMessage : [
  //   { type : 'info', /*link : '/elemental-event#segmentHeaderWrap',*/ persist : false, message : "A BIG congratulations to Bicycle Berserker for being the first to reach level 100!!!" }
  // ],

  // RANKING PAGE
  AVATAR_COUNT_PER_PAGE : 20
};



module.exports = { config };