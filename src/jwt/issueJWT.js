const jsonwebtoken = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");

const pathToKey = path.join(__dirname, "id_rsa_priv.pem");
const PRIV_KEY = fs.readFileSync(pathToKey, "utf8");

function issueJWT(user) {
  // Frontend expects 'd' for days
  const expiresIn = "28d";
  const payload = {
    sub: user.id,
    email: user.email,
    iat: Date.now(),
  };
  const signedToken = jsonwebtoken.sign(payload, PRIV_KEY, {
    expiresIn,
    algorithm: "RS256",
  });
  console.log(payload);
  return {
    token: `Bearer ${signedToken}`,
    expiresIn: expiresIn,
  };
}

module.exports = issueJWT;
