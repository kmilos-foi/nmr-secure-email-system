const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");
const session = require("express-session");
const crypto = require("crypto");

const authenticationService = require("./services/authenticationService.js");

const port = process.env.PORT || 12000;

const server = express();
const app = http.createServer(server);

const wss = new WebSocket.Server({ noServer: true });

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
        wss.handleUpgrade(req, socket, head, (ws) => {
            wss.emit("connection", ws, req);
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
    configureSession();
}

function configureSession() {
    const sessionSecret = crypto.randomBytes(32).toString("base64");
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
}

function handleWebSocketConnections() {
    wss.on("connection", (ws, req) => {
        console.log("New WebSocket connection established.");

        ws.on("message", (message) => {
            console.log("Received message from client:", message);
            ws.send(JSON.stringify({ status: "Message received", data: message }));
        });

        ws.on("close", () => {
            console.log("WebSocket connection closed.");
        });

        ws.on("error", (error) => {
            console.error("WebSocket error:", error);
        });
    });
}
