let socket;
let lblError = document.getElementById("lblError");
let clientKeyPair;
let aesKey;
document.addEventListener("DOMContentLoaded", async () => {
  document
    .getElementById("compose-icon")
    .addEventListener("click", toggleCompose);
  document
    .getElementById("close-compose")
    .addEventListener("click", toggleCompose);

  setSendMessageButton();
  socket = new WebSocket("ws://localhost:12000");
  setupWebSocket();

  await setMessagesTable();
  await generateClientKeyPair();
  let rawKey = await crypto.subtle.exportKey("raw", clientKeyPair.publicKey);
  let key = bytesToHex(new Uint8Array(rawKey));
  console.log(key);
  sendSocketMessage(key);
});

function toggleCompose() {
  const composeDiv = document.getElementById("compose-div");
  if (composeDiv.style.display === "none" || !composeDiv.style.display) {
    composeDiv.style.display = "block";
  } else {
    composeDiv.style.display = "none";
  }
}

function setSendMessageButton() {
  const sendButton = document.getElementById("btnSendMessage");
  sendButton.addEventListener("click", handleSendMessageClick);
}

function handleSendMessageClick(event) {
  event.preventDefault();
  if (isFormValid()) {
    sendMessage();
  }
}

function isFormValid() {
  return messageForm.checkValidity();
}

function sendMessage() {
  const messageData = {};
  messageData.data = setMessageBody();

  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(messageData));
  } else {
    alert("Something went wrong. Please try again.");
  }
}

function setMessageBody() {
  const receiver_username = document.getElementById("txtReciever").value.trim();
  const subject = document.getElementById("txtSubject").value.trim();
  const message = document.getElementById("message-content").value.trim();

  return {
    receiver_username: receiver_username,
    subject: subject,
    content: message,
  };
}

function handleSendSuccess() {
  resetMessageForm();
}

function handleSendFailure() {
  alert("Failed to send the message. Please try again.");
}

function resetMessageForm() {
  document.getElementById("txtReciever").value = "";
  document.getElementById("txtSubject").value = "";
  document.getElementById("message-content").value = "";
}

function setupWebSocket() {
  socket.addEventListener("open", () => {
    console.log("WebSocket connection established.");
  });

  socket.addEventListener("message", async (event) => {
    const serverResponse = JSON.parse(event.data);
    console.log(serverResponse);
    {
      if (serverResponse.type == "message_send_error") {
        lblError.textContent =
          serverResponse.data.message || "An error occurred.";
        lblError.style.visibility = "visible";
      } else if (serverResponse.type === "message_ack") {
        lblError.style.display = "none";
        toggleCompose();
        resetMessageForm();
        addMessageToTable(serverResponse.data.message);
      } else if (serverResponse.type === "new_message") {
        console.log("server response", serverResponse);
        console.log(serverResponse.message);
        addMessageToTable(serverResponse.message);
      } else if (serverResponse.type === "public_key") {
        const serverPublicKeyBuffer = Uint8Array.from(
          hexToBytes(serverResponse.data.key)
        );
        const importedServerKey = await importServerKey(serverPublicKeyBuffer);
        const sharedSecret = await getSecret(importedServerKey);
        aesKey = await generateAESKey(sharedSecret);
      }
    }
  });

  socket.addEventListener("error", (error) => {});

  socket.addEventListener("close", () => {});
}

function sendSocketMessage(key) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: "public_key", data: { key: key } }));
  } else {
    alert("Something went wrong. Please try again.");
  }
}

async function setMessagesTable() {
  let messages = await getMessages();
  const tbody = document.getElementById("tbody");
  tbody.innerHTML = "";

  messages.forEach((message) => {
    const row = document.createElement("tr");

    const senderCell = document.createElement("td");
    senderCell.textContent = message.sender_username;

    const receiverCell = document.createElement("td");
    receiverCell.textContent = message.receiver_username;

    const subjectCell = document.createElement("td");
    subjectCell.textContent = message.subject;

    const timestampCell = document.createElement("td");
    timestampCell.textContent = message.sent_at;

    row.appendChild(senderCell);
    row.appendChild(receiverCell);
    row.appendChild(subjectCell);
    row.appendChild(timestampCell);
    tbody.appendChild(row);
  });
}

async function getMessages() {
  let response = await fetch("/messages");
  let data = await response.json();
  return data;
}

function addMessageToTable(message) {
  const tbody = document.getElementById("tbody");
  const row = document.createElement("tr");

  const senderCell = document.createElement("td");
  senderCell.textContent = message.sender_username;

  const receiverCell = document.createElement("td");
  receiverCell.textContent = message.receiver_username;

  const subjectCell = document.createElement("td");
  subjectCell.textContent = message.subject;

  const timestampCell = document.createElement("td");
  timestampCell.textContent = message.sent_at;

  row.appendChild(senderCell);
  row.appendChild(receiverCell);
  row.appendChild(subjectCell);
  row.appendChild(timestampCell);

  if (tbody.firstChild) {
    tbody.insertBefore(row, tbody.firstChild);
  } else {
    tbody.appendChild(row);
  }
}

async function generateClientKeyPair() {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true,
    ["deriveKey", "deriveBits"]
  );
  clientKeyPair = keyPair;
}
function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
function hexToBytes(hex) {
  const bytes = [];
  for (let c = 0; c < hex.length; c += 2) {
    bytes.push(parseInt(hex.substr(c, 2), 16));
  }
  return bytes;
}
function generateIV() {
  const iv = new Uint8Array(16);
  window.crypto.getRandomValues(iv);
  return iv;
}
async function importServerKey(serverPublicKeyBuffer) {
  return await crypto.subtle.importKey(
    "raw",
    serverPublicKeyBuffer,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    []
  );
}
async function getSecret(serverKey) {
  return await crypto.subtle.deriveBits(
    {
      name: "ECDH",
      public: serverKey,
    },
    clientKeyPair.privateKey,
    256
  );
}
async function generateAESKey(secret) {
  return await crypto.subtle.importKey(
    "raw",
    new Uint8Array(secret),
    { name: "AES-CBC" },
    false,
    ["encrypt", "decrypt"]
  );
}
