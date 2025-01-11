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
}

module.exports = MessageDao;




