const { testSpecificFoe, attackOfTheElements } = require('./game/specialEvents/specialEventList');

const appState = ['live','maintenance'];
const config = {
  mode : appState[0],
  specialEvent : attackOfTheElements,


  globalMessage : [
    { type : 'info', /*link : '/elemental-event#percentTable',*/ persist : false, message : "HeroFit is turning 1! Enjoy a piece of cake in your inventory to celebrate!" }
  ],

  // RANKING PAGE
  AVATAR_COUNT_PER_PAGE : 20
};



module.exports = { config };