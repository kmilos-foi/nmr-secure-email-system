const crypto = require("crypto");

exports.encrypt = function (aesKey, data, iv) {
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(aesKey, "hex"),
    iv
  );

  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");

  return encrypted;
};

exports.decrypt = function (aesKey, encryptedData, iv) {
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(aesKey, "hex"),
    iv
  );

  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
};

exports.generateIV = function () {
  return crypto.randomBytes(16);
};

exports.generateAESKey = function (sharedSecret) {
  const hmac = crypto.createHmac("sha256", sharedSecret);
  hmac.update("aes-key");
  const aesKeyBuffer = hmac.digest();

  return new Uint8Array(aesKeyBuffer.slice(0, 32));
};
