const crypto = require("crypto");

function encryptWithPublicKey(publicKey, message) {
  const bufferMessage = Buffer.from(message, "utf8");
  return crypto.publicEncrypt(publicKey, bufferMessage);
}

function encryptWithPrivateKey(privateKey, message) {
  const bufferMessage = Buffer.from(message, "utf8");
  return crypto.privateEncrypt(privateKey, bufferMessage);
}

function decryptWithPrivateKey(privateKey, encryptedMessage) {
  return crypto.privateDecrypt(privateKey, encryptedMessage);
}

function decryptWithPublicKey(publicKey, encryptedMessage) {
  return crypto.privateDecrypt(publicKey, encryptedMessage);
}

module.exports = {
  encryptWithPublicKey,
  decryptWithPrivateKey,
  encryptWithPrivateKey,
  decryptWithPublicKey,
};
