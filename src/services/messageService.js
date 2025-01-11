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
        await messageDao.insertMessage(userId, receiverId, data.subject, data.content);
        return { success: true, message: "Message sent successfully." };
    } catch (e) {
        return { success: false, message: "Something went wrong. Try again!" };
    }
};
