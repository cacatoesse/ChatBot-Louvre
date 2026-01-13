// On déclare les variables globales
let chatInput;
let chatSendBtn;
let chatMessagesBox;
let chatExpandBtn; // Nouveau

/**
 * Initialise le chatbot
 */
function initChatbot() {
    console.log("Initialisation du chatbot...");

    chatInput = document.querySelector(".chat-input-area input");
    chatSendBtn = document.querySelector(".send-btn");
    chatMessagesBox = document.querySelector(".chat-messages");
    chatExpandBtn = document.getElementById("expandBtn");

    if (!chatInput || !chatSendBtn || !chatMessagesBox) {
        console.error("❌ Erreur éléments chatbot manquants.");
        return;
    }

    // 1. Envoi Message
    chatSendBtn.addEventListener("click", sendMessage);
    chatInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            sendMessage();
        }
    });

    // 2. Gestion du bouton "Agrandir / Réduire"
    if (chatExpandBtn) {
        chatExpandBtn.addEventListener("click", toggleExpand);
    }

    console.log("✅ Chatbot initialisé.");
}

/**
 * Toggle Ouverture/Fermeture du widget
 */
function toggleChat() {
    const chatWindow = document.getElementById('chatWindow');
    const chatBtn = document.querySelector('.chat-toggle-btn');
    
    if (chatWindow) chatWindow.classList.toggle('chat-open');
    if (chatBtn) chatBtn.classList.toggle('btn-active');
}

/**
 * NOUVEAU : Toggle Agrandissement (50%)
 */
function toggleExpand() {
    const chatWindow = document.getElementById('chatWindow');
    const btn = document.getElementById('expandBtn');
    
    if (chatWindow) {
        chatWindow.classList.toggle('expanded');
        
        // Change l'icône selon l'état
        if (chatWindow.classList.contains('expanded')) {
            btn.innerHTML = "⤡"; // Icône réduire
            btn.title = "Réduire";
        } else {
            btn.innerHTML = "⤢"; // Icône agrandir
            btn.title = "Agrandir";
        }
    }
}

/**
 * Ajoute un message dans l'interface
 * @param {string} text - Le contenu HTML ou texte
 * @param {string} sender - 'user' ou 'bot'
 * @param {number|null} duration - Temps en ms (optionnel, pour le bot)
 */
function addMessage(text, sender, duration = null) {
    if (!chatMessagesBox) return;

    const msgContainer = document.createElement("div");
    msgContainer.className = "message " + sender;

    // Structure : Bulle de contenu + Temps optionnel
    let htmlContent = `<div class="msg-content"><p>${text}</p></div>`;

    // Ajout du temps d'exécution en bas si présent
    if (duration !== null) {
        // Conversion ms -> secondes pour affichage propre
        const seconds = (duration / 1000).toFixed(2);
        htmlContent += `<span class="exec-time">Généré en ${seconds}s</span>`;
    }

    msgContainer.innerHTML = htmlContent;
    
    chatMessagesBox.appendChild(msgContainer);
    chatMessagesBox.scrollTop = chatMessagesBox.scrollHeight;
}

/**
 * Envoie le message au backend
 */
async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    // 1. Message utilisateur
    addMessage(text, "user");
    chatInput.value = ""; 

    // 2. Loader ÉLÉGANT (multilingue)
    const loadingId = "loading-" + Date.now();
    const loadingDiv = document.createElement("div");
    loadingDiv.className = "message bot";
    loadingDiv.id = loadingId;
    // Trois petits points animés via CSS
    loadingDiv.innerHTML = `
        <div class="msg-content">
            <div class="typing-indicator">
                <span></span><span></span><span></span>
            </div>
        </div>`;
    
    chatMessagesBox.appendChild(loadingDiv);
    chatMessagesBox.scrollTop = chatMessagesBox.scrollHeight;

    // Timer Start
    const startTime = performance.now();

    try {
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: text })
        });

        const data = await response.json();

        // Timer End
        const endTime = performance.now();
        const executionTime = endTime - startTime; // en ms

        // Retrait loader
        const loader = document.getElementById(loadingId);
        if (loader) loader.remove();

        // 3. Réponse Bot avec temps
        if (data.response) {
            addMessage(data.response, "bot", executionTime);
        } else {
            addMessage("Désolé, je n'ai pas compris.", "bot", executionTime);
        }

    } catch (err) {
        const loader = document.getElementById(loadingId);
        if (loader) loader.remove();
        console.error("Erreur API:", err);
        addMessage("❌ Erreur de connexion.", "bot");
    }
}