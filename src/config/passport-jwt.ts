import fs from "fs";
import path from "path";
import { User } from "./db";
import { Strategy, ExtractJwt } from "passport-jwt";

const pathToKey = path.join(__dirname, "../jwt", "id_rsa_pub.pem");
const PUB_KEY = fs.readFileSync(pathToKey, "utf8");

const options = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: PUB_KEY,
  algorithms: ["RS256"],
  jsonWebTokenOptions: {
    maxAge: "7d",
  },
};

const strategy = new Strategy(options, async (payload, done) => {
  // payload.sub should contain the user id & findByPk is a sequelize method for retrieving by id

  try {
    const user = await User.findByPk(payload.sub);
    return user ? done(null, user) : done(null, false);
  } catch (error) {
    return done(error);
  }
});

module.exports = passport => {
  passport.use(strategy);
};
