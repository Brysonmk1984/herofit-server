const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const { db, User } = require('../config/db');
const { validatePassword } = require('../lib/passwordUtils');

const customFields = {};

const verifyCallback = (username, passport, done) => {
  User.findOne({ username })
  .then((user) => {
    if(!user) {
      return done(null, false, { message: 'Incorrect username.' });
    }

    const isValid = validatePassword(password, user.hash, user.salt);

    if(isValid) {
      return done(null, user);
    }
    return done(null, false);
  })
  .catch((error) =>{
    done(error);
  });
};

const strategy = new LocalStrategy(customFields, verifyCallback);
passport.use(strategy);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((userId, done) =>{
  User.findByPk(userId)
  .then((user) => {
    if(error) { return done(error); }
    if(!user) {
      return done(null, false, { message: 'Incorrect username.' });
    }
    if(!user.validatePassword(password)) {
      return done(null, false, { message: 'Incorrect password.' });
    }
    return done(null, user);
  })
  .catch((error) =>{
    done(error);
  });
})