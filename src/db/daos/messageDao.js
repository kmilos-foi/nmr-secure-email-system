const DatabaseHandler = require("../databaseHandler.js");

class MessageDao {
  constructor() {
    this.db = new DatabaseHandler("./db/database.sqlite");
  }
  
  insertMessage = async function (sender, receiver, subject, content) {
    this.db.connect();
    let sql = "INSERT INTO messages(sender_id, receiver_id, subject, content) VALUES (?,?,?,?)";
    await this.db.executeQuery(sql, [sender, receiver, subject, content]);
    this.db.disconnect();
  };

  getUserMessagesByUserId = async function (userId) {
    this.db.connect();
  
    let sql = `
        SELECT
            m.id AS message_id,
            u1.username AS sender_username,
            u2.username AS receiver_username,
            m.subject,
            m.content,
            m.sent_at
        FROM
            messages m
        JOIN
            users u1 ON m.sender_id = u1.id
        JOIN
            users u2 ON m.receiver_id = u2.id
        WHERE
            m.sender_id = ? OR m.receiver_id = ?;
    `;
    let data = await this.db.executeQuery(sql, [userId, userId]);
  
    this.db.disconnect();
  
    return data;
  };
}
module.exports = MessageDao;




