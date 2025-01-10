const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");

const server = express();
const app = http.createServer(server);
const wss = new WebSocket.Server({ server: app });

const port = process.env.PORT || 12000;
server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});