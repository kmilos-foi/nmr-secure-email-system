const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");
const session = require("express-session");
const crypto = require("crypto");
require("dotenv-safe").config();

const authenticationService = require("./services/authenticationService.js");
const messageService = require("./services/messageService.js");
const aes = require("./util/aes-encryption.js");

const port = process.env.PORT || 12000;

const server = express();
const app = http.createServer(server);

const wss = new WebSocket.Server({ noServer: true });
const clients = new Map();

const sessionMiddleware = session({
  secret: crypto.randomBytes(32).toString("base64"),
  saveUninitialized: true,
  resave: false,
  cookie: {
    maxAge: 1000 * 60 * 60,
    httpOnly: true,
    sameSite: "strict",
    secure: false,
  },
});

startServer();

async function startServer() {
  configureServer();
  serveStaticFiles();
  serveHtml();
  serveServices();
  handleWebSocketConnections();

  app.on("upgrade", (req, socket, head) => {
    if (req.headers["upgrade"] !== "websocket") {
      socket.destroy();
      return;
    }

    sessionMiddleware(req, {}, () => {
      if (!req.session) {
        socket.destroy();
        return;
      }

      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    });
  });

  server.use((req, res) => {
    res.status(404).json({ message: "Wrong URL" });
  });

  app.listen(port, () => {
    console.log(`Server running at: http://localhost:${port}`);
  });
}

function configureServer() {
  server.use(express.urlencoded({ extended: true }));
  server.use(express.json());
  server.use(sessionMiddleware);
}

function serveStaticFiles() {
  server.use("/css", express.static(path.join(__dirname, "../public/css")));
  server.use("/js", express.static(path.join(__dirname, "../public/js")));
  server.use(
    "/images",
    express.static(path.join(__dirname, "../public/images"))
  );
}

function serveHtml() {
  server.get("/", (req, res) => {
    if (req.session.userId == undefined) {
      res.redirect("/login");
    }
    res.sendFile(path.join(__dirname, "../public/html/index.html"));
  });

  server.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "../public/html/login.html"));
  });
}

function serveServices() {
  server.post("/login", authenticationService.login);
  server.get("/logout", authenticationService.logout);
}

function handleWebSocketConnections() {
  wss.on("connection", async (ws, req) => {
    const userId = req.session.userId;
    clients.set(userId, ws);
    ws.on("message", async (message) => {
      const messageType = JSON.parse(message).type;
      const messageData = JSON.parse(message).data;
      let userId = req.session.userId;
      if (!userId) {
        sendMessage(ws, "error", false, "unauthorized");
        return;
      }
      try {
        if (messageType === "public_key") {
          const ecdh = crypto.createECDH("prime256v1");
          const serverPublicKey = ecdh.generateKeys("hex");
          const clientPublicKeyBuffer = Buffer.from(messageData.key, "hex");
          const sharedSecret = ecdh.computeSecret(clientPublicKeyBuffer);
          const aesKey = aes.generateAESKey(sharedSecret);

          clients.set(userId, { ws, aesKey });
          sendData(ws, "public_key", {
            key: serverPublicKey,
          });
        } else if (messageType === "send_message") {
          let iv = base64Decode(messageData.iv);
          let content = JSON.parse(
            aes.decrypt(clients.get(userId).aesKey, messageData.content, iv)
          );
          const result = await messageService.postMessage(content, userId);
          if (result.type == "error") {
            ws.send(
              JSON.stringify({
                type: result.type,
                data: { message: result.message },
              })
            );
          } else {
            let iv = aes.generateIV();
            ws.send(
              JSON.stringify({
                type: result.type,
                data: {
                  message: aes.encrypt(
                    clients.get(userId).aesKey,
                    result.message,
                    iv
                  ),
                  iv: iv.toString("base64"),
                },
              })
            );
          }
          if (result.message.receiver_id == req.session.userId) return;
          const receiverWs = clients.get(result.message.receiver_id).ws;
          if (receiverWs && receiverWs.readyState === WebSocket.OPEN) {
            let iv = aes.generateIV();
            receiverWs.send(
              JSON.stringify({
                type: "new_message",
                data: {
                  message: aes.encrypt(
                    clients.get(result.message.receiver_id).aesKey,
                    result.message,
                    iv
                  ),
                  iv: iv.toString("base64"),
                },
              })
            );
          }
        } else if (messageType === "fetch_messages") {
          let messages = await messageService.getMessages(userId);
          let iv = aes.generateIV();
          ws.send(
            JSON.stringify({
              type: "all_messages",
              data: {
                message: aes.encrypt(
                  clients.get(userId).aesKey,
                  JSON.stringify(messages),
                  iv
                ),
                iv: iv.toString("base64"),
              },
            })
          );
        }
      } catch (ex) {
        console.log(ex.message);
        sendMessage(ws, "error", "something went wrong");
      }
    });

    ws.on("close", () => {});

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });
  });
}

function sendMessage(ws, type, message) {
  ws.send(
    JSON.stringify({
      type: type,
      data: {
        message: message,
      },
    })
  );
}

function sendData(ws, type, data) {
  ws.send(
    JSON.stringify({
      type: type,
      data: data,
    })
  );
}

function base64Decode(base64) {
  const binaryString = atob(base64);
  const len = binaryString.length;

  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
