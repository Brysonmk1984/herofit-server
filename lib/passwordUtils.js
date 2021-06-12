const crypto = require('crypto');
const jwt = require("jsonwebtoken");

function genPassword(password){
  const salt = crypto.randomBytes(32).toString('hex');
  const genHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return {
    salt,
    hash : genHash
  }
}

function validatePassword(password, hash, salt){
  const hashVerify = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hash === hashVerify;
}

// For Account Registeration Email Verification
function randomEmailString(){
  return crypto.randomBytes(8).toString('hex');
}

// `secret` is passwordHash concatenated with user's
// createdAt value, so if someone malicious gets the
// token they still need a timestamp to hack it:
const usePasswordHashToMakeToken = ({ hash, email, createdAt }) => {
  const secret = hash + "-" + createdAt;
  const token = jwt.sign({ email }, secret, { expiresIn: 3600 }); // Expires in 1 hour

  return token;
}

module.exports = { validatePassword, genPassword, randomEmailString, usePasswordHashToMakeToken }