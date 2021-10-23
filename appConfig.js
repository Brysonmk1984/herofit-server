const { testSpecificFoe, helloween } = require('./game/specialEvents/specialEventList');

const appState = ['live','maintenance'];
const config = {
  mode : appState[0],
  specialEvent : helloween,


  // globalMessage : [
  //   { type : 'info', persist : false, message : "Check out the latest updates on the upcoming HeroFit app!", link : "https://www.reddit.com/gallery/qdhgl5" }
  // ],

  // RANKING PAGE
  AVATAR_COUNT_PER_PAGE : 20
};



module.exports = { config };