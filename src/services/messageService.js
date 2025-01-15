const MessageDAO = require("../db/daos/messageDao.js");
const UserDAO = require("../db/daos/userDao.js");
const aesEncryption = require("../util/aes-encryption.js");

function decryptMessage(message) {
  if (!message.iv) {
    throw new Error("Missing IV for decryption.");
  }

  const decryptedSubject = aesEncryption.decrypt(
    process.env.AES_KEY,
    message.subject,
    Buffer.from(message.iv, "hex")
  );
  const decryptedContent = aesEncryption.decrypt(
    process.env.AES_KEY,
    message.content,
    Buffer.from(message.iv, "hex")
  );

  const { iv, ...restOfMessage } = message;

  return {
    ...restOfMessage,
    subject: decryptedSubject,
    content: decryptedContent,
  };
}

exports.postMessage = async function (data, userId) {
  let messageDao = new MessageDAO();
  let userDao = new UserDAO();

  if (!data.subject || !data.receiver_username) {
    return {
      type: "message_send_error",
      message: "Subject and receiver are required.",
    };
  }

  let receiverId = await userDao.getUserIdByUsername(data.receiver_username);
  if (!receiverId) {
    return { type: "message_send_error", message: "Receiver does not exist." };
  }
  let iv = aesEncryption.generateIV();
  let encryptedSubject = aesEncryption.encrypt(
    process.env.AES_KEY,
    data.subject,
    iv
  );
  let encryptedContent = aesEncryption.encrypt(
    process.env.AES_KEY,
    data.content,
    iv
  );

  let insertedMessage = await messageDao.insertMessage(
    userId,
    receiverId,
    encryptedSubject,
    encryptedContent,
    iv.toString("hex")
  );

  let message = await messageDao.getMessageByMessageId(insertedMessage.id);
  let decryptedMessage = decryptMessage(message);

  return { type: "message_ack", message: decryptedMessage };
};

exports.getMessages = async function (req, res) {
  res.type("application/json");
  let messageDao = new MessageDAO();
  let userId = req.session.userId;

  let messages = await messageDao.getUserMessagesByUserId(userId);

  const decryptedMessages = messages.map((message) => decryptMessage(message));

  res.status(200).json(decryptedMessages);
};
