const UserDAO = require("../db/daos/userDao.js");

exports.login = async function (req, res) {
    let userDao = new UserDAO();
    let userData = req.body;
    res.type("application/json");

    if (!userData.username || !userData.password) {
        return401(res, "Missing password or username");
        return;
    }

    let existingUser = await userDao.getUserByUsernameAndPassword(userData.username, userData.password);

    if (!existingUser) {
        return401(res, "Login failed");
        return;
    } else {
        req.session.userId = existingUser.id;
        return200(res);
        return;
    }
}

function return401(res, message) {
    res.status(401);
    res.send(JSON.stringify({ error: message }));
}

function return200(res) {
    res.status(200);
    res.send(JSON.stringify({ error: "Login successful" }));
}

exports.logout = async function (req, res) {
    if (req.session.username) {
      let message = `${req.ip} Logout ${req.session.username}`;
      log(message);
    }
    req.session.destroy(() => {
      res.redirect("/login");
    });
};