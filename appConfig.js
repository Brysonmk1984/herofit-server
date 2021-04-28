const appState = ['live','maintenance'];

const config = {
  mode : appState[0],
  specialEvent : {
    eventName : "Elemental Ambush",
    description : "For twelve weeks, a new Elemental foe will be released in the game! During this time, there will be an increased chance to battle the new foe, as well as bonus Photon Tokens and XP for winning!",
    foeActions : [
      "Increased Likelyhood Foe 33"
    ],
    foes : ['Gusty Rascal'],
    isLive : true
  },
  // globalMessage : [
  //   { type : 'info', link : null, persist : false, message : "If you're receiving errors, refresh your page. If problems persist, try clearing your cache." }
  // ],

  // RANKING PAGE
  AVATAR_COUNT_PER_PAGE : 20
};



module.exports = { config };