const crypto = require("crypto");

exports.encrypt = function (data, iv) {
    const aesKey = process.env.AES_KEY;
    const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(aesKey, "hex"), iv);

    let encrypted = cipher.update(data, "utf8", "hex");
    encrypted += cipher.final("hex");

    return encrypted
};

exports.generateIV = function () {
    return crypto.randomBytes(16);
};