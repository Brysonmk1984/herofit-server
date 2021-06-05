const jsonwebtoken = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const pathToKey = path.join(__dirname, 'id_rsa_priv.pem');
const PRIV_KEY = fs.readFileSync(pathToKey, 'utf8');

function issueJWT(user){
  const expiresIn = '14d';
  const payload = {
    sub : user.id,
    iat : Date.now()
  };
  const signedToken = jsonwebtoken.sign(payload, PRIV_KEY, { expiresIn, algorithm : 'RS256' })
  console.log(payload);
  return {
    token : `Bearer ${signedToken}`,
    expires : expiresIn
  }
}

module.exports = issueJWT;

