import crypto from "crypto";
import jwt from "jsonwebtoken";

function genPassword(password: string) {
  const salt = crypto.randomBytes(32).toString("hex");
  const genHash = crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
  return {
    salt,
    hash: genHash,
  };
}

function validatePassword(password: string, hash: string, salt: string) {
  const hashVerify = crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
  return hash === hashVerify;
}

// For Account Registration Email Verification
function randomEmailString() {
  return crypto.randomBytes(8).toString("hex");
}

// `secret` is passwordHash concatenated with user's
// createdAt value, so if someone malicious gets the
// token they still need a timestamp to hack it:
const usePasswordHashToMakeToken = (hash: string, email: string, createdAt: string) => {
  const secret = hash + "-" + createdAt;
  const token = jwt.sign({ email }, secret, { expiresIn: 3600 }); // Expires in 1 hour

  return token;
};

export { validatePassword, genPassword, randomEmailString, usePasswordHashToMakeToken };
