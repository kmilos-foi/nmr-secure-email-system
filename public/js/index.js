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
  messageData.data = {};
  let dataToEncrypt = JSON.stringify(setMessageBody());
  messageData.type = "send_message";

  const textBytes = aesjs.utils.utf8.toBytes(dataToEncrypt);
  const iv = generateIV();
  const paddedBytes = aesjs.padding.pkcs7.pad(textBytes);
  const aesCbc = new aesjs.ModeOfOperation.cbc(aesKey, iv);
  const encryptedBytes = aesCbc.encrypt(paddedBytes);
  const encryptedHex = aesjs.utils.hex.fromBytes(encryptedBytes);
  messageData.data.iv = arrayBufferToBase64(iv);
  messageData.data.content = encryptedHex;
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
  socket.addEventListener("open", async () => {
    await generateClientKeyPair();
    let rawKey = await crypto.subtle.exportKey("raw", clientKeyPair.publicKey);
    let key = bytesToHex(new Uint8Array(rawKey));
    sendSocketMessage("public_key", { key: key });
  });

  socket.addEventListener("message", async (event) => {
    const serverResponse = JSON.parse(event.data);
    {
      if (serverResponse.type == "message_send_error") {
        lblError.textContent =
          serverResponse.data.message || "An error occurred.";
        lblError.style.visibility = "visible";
      } else if (serverResponse.type === "message_ack") {
        lblError.style.visibility = "hidden";
        let iv = base64ToBytes(serverResponse.data.iv);
        const message = JSON.parse(decrypt(serverResponse.data.message, iv));
        toggleCompose();
        resetMessageForm();
        addMessageToTable(message);
      } else if (serverResponse.type === "new_message") {
        let iv = base64ToBytes(serverResponse.data.iv);
        const message = JSON.parse(decrypt(serverResponse.data.message, iv));
        addMessageToTable(message);
      } else if (serverResponse.type === "public_key") {
        const serverPublicKeyBuffer = Uint8Array.from(
          hexToBytes(serverResponse.data.key)
        );
        const importedServerKey = await importServerKey(serverPublicKeyBuffer);
        const sharedSecret = await getSecret(importedServerKey);
        aesKey = await generateAESKey(sharedSecret);
        sendSocketMessage("fetch_messages", {});
      } else if (serverResponse.type === "all_messages") {
        let iv = base64ToBytes(serverResponse.data.iv);
        let data = decrypt(serverResponse.data.message, iv);
        data = JSON.parse(data);
        let messages = JSON.parse(data);
        setMessagesTable(messages);
      }
    }
  });

  socket.addEventListener("error", (error) => {});

  socket.addEventListener("close", () => {});
}

function sendSocketMessage(type, data) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: type, data: data }));
  } else {
    alert("Something went wrong. Please try again.");
  }
}

function setMessagesTable(messages) {
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

    row.addEventListener("click", () => toggleMessageDetails(row, message));
    tbody.appendChild(row);
  });
}

function toggleMessageDetails(row, message) {
  if (
    row.nextElementSibling &&
    row.nextElementSibling.classList.contains("message-details")
  ) {
    row.nextElementSibling.remove();
    return;
  }
  const detailsRow = document.createElement("tr");
  detailsRow.classList.add("message-details");

  const detailsCell = document.createElement("td");
  detailsCell.colSpan = 4;
  detailsCell.innerHTML = `
    <div>
      <strong>Sender:</strong> ${message.sender_username}<br>
      <strong>Receiver:</strong> ${message.receiver_username}<br>
      <strong>Subject:</strong> ${message.subject}<br>
      <strong>Content:</strong> ${message.content}<br>
    </div>
  `;

  detailsRow.appendChild(detailsCell);

  row.parentNode.insertBefore(detailsRow, row.nextSibling);
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
  row.addEventListener("click", () => toggleMessageDetails(row, message));
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
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new Uint8Array(secret),
    { name: "AES-CBC" },
    true,
    ["encrypt", "decrypt"]
  );

  const rawKey = await crypto.subtle.exportKey("raw", cryptoKey);
  return new Uint8Array(rawKey);
}

function arrayBufferToHex(buffer) {
  const byteArray = new Uint8Array(buffer);
  return Array.from(byteArray)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function arrayBufferToBase64(buffer) {
  const byteArray = new Uint8Array(buffer);
  const binaryString = Array.from(byteArray)
    .map((byte) => String.fromCharCode(byte))
    .join("");
  return btoa(binaryString);
}
function base64ToBytes(base64String) {
  const binaryString = atob(base64String);
  const byteArray = new Uint8Array(binaryString.length);

  for (let i = 0; i < binaryString.length; i++) {
    byteArray[i] = binaryString.charCodeAt(i);
  }

  return byteArray;
}
function decrypt(encryptedHex, iv) {
  const aesCbcDecrypt = new aesjs.ModeOfOperation.cbc(aesKey, iv);
  let encryptedBytes = aesjs.utils.hex.toBytes(encryptedHex);
  const decryptedBytes = aesCbcDecrypt.decrypt(encryptedBytes);
  const unpaddedBytes = aesjs.padding.pkcs7.strip(decryptedBytes);
  return aesjs.utils.utf8.fromBytes(unpaddedBytes);
}
