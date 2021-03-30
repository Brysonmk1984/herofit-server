const moment = require('moment');
const jwt = require('jsonwebtoken');
const jwkToPem = require('jwk-to-pem');
const jwkJson =  require('./jwk.json');
const key = jwkJson['keys'].find(key => {
   return key.kid;
})
const pem = jwkToPem(key);

const authenticateJWT = (req, res, next) => {

  if(!req.headers.authorization){
    const error = new Error("Authentication error, please try again.");
    return res.formatter.forbidden(error.toString(), "Token didn't get passed to authenticate function");
  }
   const authHeader = req.headers.authorization;
   const token = authHeader.split(' ')[1];
    console.log('THE TOKEN in jwtValidation befor everify - ', token);
   jwt.verify(token,  pem, { algorithms: ['RS256'] }, (error, user) => {
      // TOKEN is invalid
      if(error) {
          const _error = {
            status : 403,
            message : "Invalid credentials, try signing in again.",
            debug : `Token Invalid - ${error.toString()}`
        }
         return res.formatter.forbidden(_error, 'JWT Invalid');
      // TOKEN has Expired
      } else if (Date.now() >= user.exp * 1000) {
         const error = {
            status : 403,
            message : 'COGNITO TOKEN EXPIRED',
            debug : `Token Expiration: ${moment.utc(user.exp)}, Evaluation Date: ${moment.utc(Date.now())}`
         }
         return res.formatter.forbidden(error, 'JWT is out of date');

      // AUDIENCE in token different from Client ID
      }else if(user.aud !== process.env.COGNITO_CLIENT_ID){
         const error = {
            status : 403,
            message : `AUD / CLIENT ID MISMATCH`,
            debug : `AUD : ${user.aud}, CLIENT ID: ${process.env.COGNITO_CLIENT_ID}`
         }
         return res.formatter.forbidden(error, 'JWT user mismatch');
      }
      req.user = user;
      next();
   });
};

module.exports = { authenticateJWT };
