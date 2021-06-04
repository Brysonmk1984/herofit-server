const base64url = require('base64url');
const crypto = require('crypto');
const signatureFunction = crypto.createSign('RSA-SHA256');
const verifyFunction = crypto.createVerify('RSA-SHA256');
const fs = require('fs');

const headerObj = {
  alg : 'RS256',
  typ : 'JWT'
};

const payloadObj = {
  sub : '1234567890',
  name : 'John Doe',
  admin : true,
  iat : 1516239022
};

const headerObjString = JSON.stringify(headerObj);
const payloadObjString = JSON.stringify(payloadObj);

const b64Header = base64url(headerObjString);
const b64Payload = base64url(payloadObjString);

signatureFunction.write(b64Header + '.' + b64Payload);
signatureFunction.end();

const PRIV_KEY = fs.readFileSync(__dirname + '/priv_key.pem', 'utf8');
const signatureB64 = signatureFunction.sign(PRIV_KEY, 'base64');
const signatureB64Url = base64url.fromBase64(signatureB64);




/* 
  VERIFY
*/


const JWT = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.POstGetfAytaZS82wHcjoTyoqhMyxXiWdR7Nn7A29DNSl0EiXLdwJ6xC6AfgZWF1bOsS_TuYI3OG85AmiExREkrS6tDfTQ2B3WXlrr-wp5AokiRbz3_oB4OxG-W9KcEEbDRcZc0nH3L7LzYptiy1PtAylQGxHTWZXtGz4ht0bAecBgmpdgXMguEIcoqPJ1n3pIWk_dUZegpqx0Lka21H6XxUTxiy8OcaarA8zdnPUnV6AmNP3ecFawIFYdvJB_cm-GvpCSbr8G8y_Mllj8f4x9nBH8pQux89_6gUY618iYv7tuPWBFfEbLxtF2pZS6YC1aSfLQxeNe8djT9YjpvRZA';


const jwtParts = JWT.split('.');

const headerInB64Format = jwtParts[0];
const payloadInB64Format = jwtParts[1];
const signatureInB64Format = jwtParts[2];

verifyFunction.write(headerInB64Format + '.' + payloadInB64Format);
verifyFunction.end();


const jwtSignatureB64 = base64url.toBase64(signatureInB64Format);
const PUB_KEY = fs.readFileSync(__dirname + '/pub_key.pem', 'utf8');
const signatureIsValid = verifyFunction.verify(PUB_KEY, jwtSignatureB64, 'base64');

console.log(signatureIsValid);