// On déclare les variables pour qu'elles soient accessibles dans tout le fichier
let chatInput;
let chatSendBtn;
let chatMessagesBox;

/**
 * Initialise le chatbot : récupère les éléments du DOM et attache les événements.
 * Cette fonction doit être appelée UNE FOIS que le HTML du chatbot est inséré dans la page.
 */
function initChatbot() {
    console.log("Initialisation du chatbot...");

    chatInput = document.querySelector(".chat-input-area input");
    chatSendBtn = document.querySelector(".send-btn");
    chatMessagesBox = document.querySelector(".chat-messages");

    // Vérification de sécurité
    if (!chatInput || !chatSendBtn || !chatMessagesBox) {
        console.error("❌ Erreur : Impossible de trouver les éléments du chatbot (input, bouton ou zone de messages).");
        return;
    }

    // 1. Événement Clic sur la flèche
    chatSendBtn.addEventListener("click", () => {
        sendMessage();
    });

    // 2. Événement Touche "Entrée" dans l'input
    chatInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault(); // Empêche le saut de ligne si c'était un textarea
            sendMessage();
        }
    });

    console.log("✅ Chatbot initialisé avec succès.");
}

/**
 * Ouvre ou ferme la fenêtre de chat
 */
function toggleChat() {
    const chatWindow = document.getElementById('chatWindow');
    const chatBtn = document.querySelector('.chat-toggle-btn');
    
    if (chatWindow) chatWindow.classList.toggle('chat-open');
    if (chatBtn) chatBtn.classList.toggle('btn-active');
}

/**
 * Ajoute un message dans l'interface
 */
function addMessage(text, sender) {
    if (!chatMessagesBox) return;

    const msg = document.createElement("div");
    msg.className = "message " + sender;
    msg.innerHTML = `<p>${text}</p>`;
    
    chatMessagesBox.appendChild(msg);
    // Scroll automatique vers le bas pour voir le dernier message
    chatMessagesBox.scrollTop = chatMessagesBox.scrollHeight;
}

/**
 * Envoie le message au backend
 */
async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return; // Ne rien faire si vide

    // 1. Affiche le message utilisateur immédiatement
    addMessage(text, "user");
    chatInput.value = ""; // Vide le champ

    // Petit effet de chargement (optionnel)
    const loadingId = "loading-" + Date.now();
    const loadingDiv = document.createElement("div");
    loadingDiv.className = "message bot";
    loadingDiv.id = loadingId;
    loadingDiv.innerHTML = "<p><em>Écrit...</em></p>";
    chatMessagesBox.appendChild(loadingDiv);
    chatMessagesBox.scrollTop = chatMessagesBox.scrollHeight;

    try {
        // 2. Envoi au serveur Python (FastAPI)
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: text })
        });

        const data = await response.json();

        // On retire le message de chargement
        const loader = document.getElementById(loadingId);
        if (loader) loader.remove();

        // 3. Affiche la réponse
        if (data.response) {
            addMessage(data.response, "bot");
        } else {
            addMessage("Désolé, je n'ai pas compris.", "bot");
        }

    } catch (err) {
        const loader = document.getElementById(loadingId);
        if (loader) loader.remove();
        console.error("Erreur API:", err);
        addMessage("❌ Erreur de connexion au musée.", "bot");
    }
}