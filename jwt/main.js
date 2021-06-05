const fs = require('fs');
const { encryptWithPublicKey, decryptWithPrivateKey, encryptWithPrivateKey, decryptWithPublicKey } = require('./encryptDecrypt');

const publicKey = fs.readFileSync(__dirname + '/id_rsa_pub.pem', 'utf8');
// Stores a Buffer object
const encryptedMessage = encryptWithPublicKey(publicKey, 'Super message');

const privateKey = fs.readFileSync(__dirname + '/id_rsa_priv.pem', 'utf8');
const decryptedMessage = decryptWithPrivateKey(privateKey, encryptedMessage);

// Convert buffer to string and log message
console.log(decryptedMessage.toString());