const input = document.querySelector(".chat-input-area input");
const sendBtn = document.querySelector(".send-btn");
const messagesBox = document.querySelector(".chat-messages");

function toggleChat() {
    const chatWindow = document.getElementById('chatWindow');
    const chatBtn = document.querySelector('.chat-toggle-btn');
    chatWindow.classList.toggle('chat-open');
    chatBtn.classList.toggle('btn-active');
}

function addMessage(text, sender) {
    const msg = document.createElement("div");
    msg.className = "message " + sender;
    msg.innerHTML = `<p>${text}</p>`;
    messagesBox.appendChild(msg);
    messagesBox.scrollTop = messagesBox.scrollHeight;
}

async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;

    addMessage(text, "user");
    input.value = "";

    try {
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: text })
        });

        const data = await response.json();
        addMessage(data.answer, "bot");
    } catch (err) {
        addMessage("❌ Erreur de connexion au serveur.", "bot");
    }
}

sendBtn.addEventListener("click", sendMessage);
input.addEventListener("keydown", e => {
    if (e.key === "Enter") sendMessage();
});