const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const pathToKey = path.join(__dirname, "id_rsa_pub.pem");
const PUB_KEY = fs.readFileSync(pathToKey, "utf8");
const passport = require("passport");

// REPLACES OLD FUNC OF SAME NAME TO WORK WITH THE NEW PASSPORT SETUP
const authenticateJWT = (req, res, next) => {
  //console.log('REQHEADER', req.headers);
  passport.authenticate("jwt", { session: false }, (error, user, info) => {
    if (error) {
      console.log("AUTHENTICATION ERROR = ", error);
      return res.formatter.serverError(error);
    } else if (!user) {
      console.log("NO USER");
      const error = new Error("Authorization token invalid or expired");
      return res.formatter.unauthorized(error.toString());
    }
    req.user = user;
    next();
  })(req, res, next);
};

// MODIFIED OLD MIDDLEWARE TO WORK WITH NEW PASSPORT SETUP
const authenticateAdminJWT = (req, res, next) => {
  passport.authenticate("jwt", { session: false }, (error, user, info) => {
    if (error) {
      console.log("AUTHENTICATION ERROR = ", error);
      return res.formatter.serverError(error);
    } else if (!user) {
      console.log("NO USER");
      const error = new Error("Authorization token invalid or expired");
      return res.formatter.unauthorized(error.toString());
    } else if (
      user.email !== process.env.ADMIN_PANEL_EMAIL &&
      user.email !== process.env.ADMIN_PANEL_EMAIL_2 &&
      user.email !== process.env.ADMIN_PANEL_EMAIL_3
    ) {
      const error = {
        status: 401,
        message: `Unauthorized - Non-Admin User`,
        debug: `${user.email} Attempted Access to Admin Panel`,
      };
      return res.formatter.unauthorized(
        error,
        "Unauthorized Non-Admin User attempted access at control panel"
      );
    }
    req.user = user;
    next();
  })(req, res, next);
};

module.exports = { authenticateJWT, authenticateAdminJWT };
