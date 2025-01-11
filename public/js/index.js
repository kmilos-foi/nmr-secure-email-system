let socket;

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById('compose-icon').addEventListener('click', toggleCompose);
    document.getElementById('close-compose').addEventListener('click', toggleCompose);

    setSendMessageButton();
    socket = new WebSocket('ws://localhost:12000');
    setupWebSocket();
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
        console.log(messageData);
        socket.send(JSON.stringify(messageData));
        handleSendSuccess();
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
    toggleCompose();
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
        console.log("Message received from server:", event.data);
    });

    socket.addEventListener("error", (error) => {
        console.error("WebSocket error:", error);
    });

    socket.addEventListener("close", () => {
        console.log("WebSocket connection closed.");
    });
}
