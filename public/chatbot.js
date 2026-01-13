// Variables globales
let chatInput;
let chatSendBtn;
let chatMessagesBox;
let chatExpandBtn;

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

    // --- 1. CHARGEMENT DE L'HISTORIQUE DE SESSION ---
    // On utilise sessionStorage au lieu de localStorage
    loadChatHistory();

    // --- 2. RESTAURATION DE L'ÉTAT (OUVERT/FERMÉ) ---
    const isChatOpen = sessionStorage.getItem("louvre_chat_open") === "true";
    if (isChatOpen) {
        openChatInterface(); 
    }

    // --- 3. ÉVÉNEMENTS ---
    chatSendBtn.addEventListener("click", () => sendMessage());
    
    chatInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            sendMessage();
        }
    });

    if (chatExpandBtn) {
        chatExpandBtn.addEventListener("click", toggleExpand);
    }

    console.log("✅ Chatbot initialisé (Session uniquement).");
}

/**
 * Ouvre ou ferme le chat
 */
function toggleChat() {
    const chatWindow = document.getElementById('chatWindow');
    const chatBtn = document.querySelector('.chat-toggle-btn');
    
    if (chatWindow && chatBtn) {
        const isNowOpen = chatWindow.classList.toggle('chat-open');
        chatBtn.classList.toggle('btn-active');
        
        // Sauvegarde TEMPORAIRE de l'état
        sessionStorage.setItem("louvre_chat_open", isNowOpen);
    }
}

/**
 * Fonction helper pour forcer l'ouverture
 */
function openChatInterface() {
    const chatWindow = document.getElementById('chatWindow');
    const chatBtn = document.querySelector('.chat-toggle-btn');
    if (chatWindow) chatWindow.classList.add('chat-open');
    if (chatBtn) chatBtn.classList.add('btn-active');
}

/**
 * Agrandir / Réduire
 */
function toggleExpand() {
    const chatWindow = document.getElementById('chatWindow');
    const btn = document.getElementById('expandBtn');
    
    if (chatWindow) {
        chatWindow.classList.toggle('expanded');
        
        if (chatWindow.classList.contains('expanded')) {
            btn.innerHTML = "⤡"; 
            btn.title = "Réduire";
        } else {
            btn.innerHTML = "⤢"; 
            btn.title = "Agrandir";
        }
    }
}

/**
 * Ajoute un message visuellement ET le sauvegarde si demandé
 */
function addMessage(text, sender, duration = null, save = true) {
    if (!chatMessagesBox) return;

    const msgContainer = document.createElement("div");
    msgContainer.className = "message " + sender;

    let htmlContent = `<div class="msg-content"><p>${text}</p></div>`;

    if (duration !== null) {
        const seconds = (duration / 1000).toFixed(2);
        htmlContent += `<span class="exec-time">Généré en ${seconds}s</span>`;
    }

    msgContainer.innerHTML = htmlContent;
    chatMessagesBox.appendChild(msgContainer);
    chatMessagesBox.scrollTop = chatMessagesBox.scrollHeight;

    if (save) {
        saveMessageToHistory(text, sender, duration);
    }
}

/**
 * Sauvegarde un message unique dans le SESSION storage
 */
function saveMessageToHistory(text, sender, duration) {
    // 1. Récupérer l'existant (Session)
    let history = JSON.parse(sessionStorage.getItem("louvre_chat_history")) || [];
    
    // 2. Ajouter le nouveau
    history.push({ text, sender, duration });
    
    // 3. Réécrire le tout
    sessionStorage.setItem("louvre_chat_history", JSON.stringify(history));
}

/**
 * Charge l'historique au démarrage
 */
function loadChatHistory() {
    // Récupération depuis la session
    const history = JSON.parse(sessionStorage.getItem("louvre_chat_history")) || [];
    
    if (history.length > 0) {
        chatMessagesBox.innerHTML = ""; 
    }

    history.forEach(msg => {
        addMessage(msg.text, msg.sender, msg.duration, false);
    });
}

/**
 * Envoie le message au backend
 */
async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    addMessage(text, "user", null, true);
    chatInput.value = ""; 

    // Loader
    const loadingId = "loading-" + Date.now();
    const loadingDiv = document.createElement("div");
    loadingDiv.className = "message bot";
    loadingDiv.id = loadingId;
    loadingDiv.innerHTML = `
        <div class="msg-content">
            <div class="typing-indicator">
                <span></span><span></span><span></span>
            </div>
        </div>`;
    
    chatMessagesBox.appendChild(loadingDiv);
    chatMessagesBox.scrollTop = chatMessagesBox.scrollHeight;

    const startTime = performance.now();

    try {
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: text })
        });

        const data = await response.json();
        const endTime = performance.now();
        const executionTime = endTime - startTime;

        const loader = document.getElementById(loadingId);
        if (loader) loader.remove();

        if (data.response) {
            addMessage(data.response, "bot", executionTime, true);
        } else {
            addMessage("Désolé, je n'ai pas compris.", "bot", executionTime, true);
        }

    } catch (err) {
        const loader = document.getElementById(loadingId);
        if (loader) loader.remove();
        console.error("Erreur API:", err);
        addMessage("❌ Erreur de connexion.", "bot", null, true);
    }
}