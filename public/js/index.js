let socket;
let lblError = document.getElementById("lblError");

document.addEventListener("DOMContentLoaded", async () => {
    document.getElementById('compose-icon').addEventListener('click', toggleCompose);
    document.getElementById('close-compose').addEventListener('click', toggleCompose);

    setSendMessageButton();
    socket = new WebSocket('ws://localhost:12000');
    setupWebSocket();

    await setMessagesTable();
});

function toggleCompose() {
    const composeDiv = document.getElementById('compose-div');
    if (composeDiv.style.display === 'none' || !composeDiv.style.display) {
        composeDiv.style.display = 'block';
    } else {
        composeDiv.style.display = 'none';
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
    const messageData = setMessageBody();

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

    socket.addEventListener("message", (event) => {
        const serverResponse = JSON.parse(event.data);
        if (!serverResponse.success) {
            lblError.textContent = serverResponse.message || "An error occurred.";
            lblError.style.visibility = "visible";
        } else {
            lblError.style.display = "none";
            toggleCompose();
            resetMessageForm();
        }
    });

    socket.addEventListener("error", (error) => {
    });

    socket.addEventListener("close", () => {
    });
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
    console.log(data);
    return data;
}

