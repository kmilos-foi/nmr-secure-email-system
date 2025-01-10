const DatabaseHandler = require("../databaseHandler.js");

class UserDao {
  constructor() {
    this.db = new DatabaseHandler("./db/database.sqlite");
  }
  getUserByUsernameAndPassword = async function (username, password) {
    this.db.connect();
    let sql = "SELECT * FROM users WHERE username=? AND password=?;";
    let data = await this.db.executeQuery(sql, [username, password]);
    this.db.disconnect();
    if (data.length == 1) return data[0];
    else return null;
  };
}

module.exports = UserDao;




