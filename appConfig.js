const config = {
  mode : 'release',
  globalMessage : [
    { type : 'info', link : null, message : "If you're receiving errors, refresh your page. If problems persist, try clearing your cache." }
  ],
};

// RANKING PAGE
const AVATAR_COUNT_PER_PAGE = 20;

module.exports = { config, AVATAR_COUNT_PER_PAGE };