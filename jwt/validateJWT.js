const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const pathToKey = path.join(__dirname, 'id_rsa_pub.pem');
const PUB_KEY = fs.readFileSync(pathToKey, 'utf8');
const passport = require('passport');

// REPLACES OLD FUNC OF SAME NAME TO WORK WITH THE NEW PASSPORT SETUP
const authenticateJWT = (req, res, next) => {
   passport.authenticate('jwt', { session : false })
   next();
};

// MODIFIED OLD MIDDLEWARE TO WORK WITH NEW PASSPORT SETUP
const authenticateAdminJWT = (req, res, next) => {
   const { authHeader } = req.headers;
   if(!authHeader){
     const error = new Error("Authentication error, please try again.");
     return res.formatter.forbidden(error.toString(), `Token didn't get passed to authenticate function - ${req.method} ${req.url}`);
   }
   const token = authHeader.split(' ')[1];

   jwt.verify(token,  PUB_KEY, { algorithms: ['RS256'] }, (error, user) => {

      // TOKEN is invalid
      if((user.email !== process.env.ADMIN_PANEL_EMAIL) && (user.email !== process.env.ADMIN_PANEL_EMAIL_2)){

      const error = {
         status : 401,
         message : `Unauthorized - Non-Admin User`,
         debug : `${user.email} Attempted Access to Admin Panel`
      }
      return res.formatter.forbidden(error, 'Unauthorized Non-Admin User attempted access at control panel');
      }
      req.user = user;
      next();
   });
 };

module.exports = { authenticateJWT, authenticateAdminJWT };
