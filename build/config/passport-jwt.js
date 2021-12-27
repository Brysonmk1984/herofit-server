"use strict";
const fs = require("fs");
const path = require("path");
const { db, User } = require("./db");
const { Strategy, ExtractJwt } = require("passport-jwt");
const pathToKey = path.join(__dirname, "../jwt", "id_rsa_pub.pem");
const PUB_KEY = fs.readFileSync(pathToKey, "utf8");
// ALL POSSIBLE OPTIONS
// const passportJWTOptions = {
//   jwtFromRequest : ExtractJwt.fromAuthHeaderAsBearerToken(),
//   secretOrKey : PUB_KEY,
//   issuer : 'enter issuer here',
//   audience : 'enter audience here',
//   algorithms : ['RS256'],
//   ignoreExpiration : false,
//   passReqToCallback : false,
//   jsonWebTokenOptions : {
//     complete : false,
//     clockTolerance : '',
//     maxAge : '7d',
//     clockTimeStamp: '100',
//     nonce : 'String here for OpenID'
//   }
// }
const options = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: PUB_KEY,
  algorithms: ["RS256"],
  jsonWebTokenOptions: {
    maxAge: "7d",
  },
};
const strategy = new Strategy(options, (payload, done) => {
  //console.log("email from JWT", payload.email);
  // payload.sub should contain the user id & findByPk is a sequelize method for retrieving by id
  return User.findByPk(payload.sub)
    .then(user => {
      //console.log('USR', user);
      if (!user) {
        return done(null, false);
      }
      return done(null, user);
    })
    .catch(error => {
      console.log("Error findByPk", error);
      return done(error);
    });
});
module.exports = passport => {
  passport.use(strategy);
};
