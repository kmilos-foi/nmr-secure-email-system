const crypto = require("crypto");
const aesJS = require("aes-js");
exports.encrypt = function (aesKey, data, iv) {
  console.log("e-iv", iv);
  console.log("e-key", aesKey);
  console.log("e-data", data);

  const textBytes = aesJS.utils.utf8.toBytes(JSON.stringify(data));
  const paddedBytes = aesJS.padding.pkcs7.pad(textBytes);
  const aesCbc = new aesJS.ModeOfOperation.cbc(aesKey, iv);
  const encryptedBytes = aesCbc.encrypt(paddedBytes);
  const encryptedHex = aesJS.utils.hex.fromBytes(encryptedBytes);

  console.log("Encrypted data (hex):", encryptedHex);

  return encryptedHex;
};

exports.decrypt = function (aesKey, encryptedData, iv) {
  console.log("d-iv", iv);
  console.log("d-key", aesKey);
  console.log("d-data", encryptedData);

  const encryptedBytes = aesJS.utils.hex.toBytes(encryptedData);
  const aesCbc = new aesJS.ModeOfOperation.cbc(aesKey, iv);
  const decryptedBytes = aesCbc.decrypt(encryptedBytes);
  const unpaddedBytes = aesJS.padding.pkcs7.strip(decryptedBytes);
  const decryptedText = aesJS.utils.utf8.fromBytes(unpaddedBytes);
  console.log("Decrypted text:", JSON.parse(decryptedText));
  return decryptedText;
};

exports.generateIV = function () {
  return crypto.randomBytes(16);
};

exports.generateAESKey = function (sharedSecret) {
  const key = Buffer.alloc(32);
  Buffer.from(sharedSecret).copy(key);
  return key;
};
