const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");
const crypto = require("crypto");


const server = express();
const app = http.createServer(server);
const wss = new WebSocket.Server({ server: app });
const port = process.env.PORT || 12000;

startServer();

async function startServer() {
    //await initializeDatabase();
    configureServer();
    serveStaticFiles();
    //serverMiddleware();

    //serveHtml();
    //serveServices();

    server.use((req, res) => {
      res.status(404);
      res.json({ message: "wrong url" });
    });

    server.listen(port, () => {
      console.log(`Server pokrenut na portu: ${port}`);
    });
}

function configureServer() {
    server.use(express.urlencoded({ extended: true }));
    server.use(express.json());
    configureSession();
}

function configureSession() {
    let sessionSecret = crypto.randomBytes(32).toString("base64");
    server.use(
      session({
        secret: sessionSecret,
        saveUninitialized: true,
        cookie: {
          maxAge: 1000 * 60 * 60,
          httpOnly: true,
          sameSite: "strict",
        },
        resave: false,
      })
    );
}

function serveStaticFiles() {
    server.use("/css", express.static(path.join(__dirname, "../public/css")));
    server.use("/js", express.static(path.join(__dirname, "../public/js")));
    server.use(
      "/images",
      express.static(path.join(__dirname, "../public/images"))
    );
}