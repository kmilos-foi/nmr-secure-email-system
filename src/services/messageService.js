const MessageDAO = require("../db/daos/messageDao.js");
const UserDAO = require("../db/daos/userDao.js");

exports.postMessage = async function (data, userId) {
    let messageDao = new MessageDAO();
    let userDao = new UserDAO();

    if (!data.subject || !data.receiver_username) {
        return { success: false, message: "Subject and receiver are required." };
    }

    let receiverId = await userDao.getUserIdByUsername(data.receiver_username);
    if (!receiverId) {
        return { success: false, message: "Receiver does not exist." };
    }

    try {
        let insertedMessage = await messageDao.insertMessage(userId, receiverId, data.subject, data.content);
        let message = await messageDao.getMessageByMessageId(insertedMessage.id);
        return { success: true, message: message };
    } catch (e) {
        return { success: false, message: "Something went wrong. Try again!" };
    }
};

exports.getMessages = async function (req, res) {
    res.type("application/json");
    let messageDao = new MessageDAO();
    let userId = req.session.userId;
    let messages = await messageDao.getUserMessagesByUserId(userId);
    res.status(200);
    res.json(messages);
};