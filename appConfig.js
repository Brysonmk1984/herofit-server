const config = {
  mode : 'release',
  globalMessage : [
    { type : 'success', message : 'Equippable Items now LIVE! if you are having issues logging in, refer to the help thread on reddit.com/r/herofit or use the contact form' },
    { type : 'info', message : 'If you have already defeated the Shadow-Self, or defeated all foes of a certain type, eg. Banshee, send a message via the contact form we will manually give you the a new costume :) ' }
  ],
};

const AVATAR_COUNT_PER_PAGE = 20;

module.exports = { config, AVATAR_COUNT_PER_PAGE };