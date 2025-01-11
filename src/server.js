const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");
const session = require("express-session");
const crypto = require("crypto");

const authenticationService = require("./services/authenticationService.js");
const messageService = require("./services/messageService.js");

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
    server.use("/images", express.static(path.join(__dirname, "../public/images")));
}

function serveHtml() {
    server.get("/", (req, res) => {
        res.sendFile(path.join(__dirname, "../public/html/index.html"));
    });

    server.get("/login", (req, res) => {
        res.sendFile(path.join(__dirname, "../public/html/login.html"));
    });
}

function serveServices() {
    server.post("/login", authenticationService.login);
    server.get("/logout", authenticationService.logout);
    server.get("/messages", messageService.getMessages);
}

function handleWebSocketConnections() {
    wss.on("connection", (ws, req) => {
        const userId = req.session.userId;
        clients.set(userId, ws);
        console.log(clients)
        ws.on("message", async (message) => {
            const data = JSON.parse(message);
            let userId = req.session.userId;
            userId=1;
            if (!userId) {
                ws.send(JSON.stringify({ status: "error", message: "Unauthorized" }));
                return;
            }

            const result = await messageService.postMessage(data, userId);
            ws.send(JSON.stringify({
                type: "message_ack",
                success: result.success,
                message: result.message,
            }));
            if (result.message.receiver_id == req.session.userId) return;
            const receiverWs = clients.get(result.message.receiver_id);
            if (receiverWs && receiverWs.readyState === WebSocket.OPEN) {
                receiverWs.send(JSON.stringify({
                    type: "new_message",
                    message: result.message,
                }));
            }
        });

        ws.on("close", () => {
        });

        ws.on("error", (error) => {
            console.error("WebSocket error:", error);
        });
    });
}
