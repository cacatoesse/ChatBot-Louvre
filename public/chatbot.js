// Variables globales
let chatInput;
let chatSendBtn;
let chatMessagesBox;
let chatExpandBtn;
let notificationBadge;
let unreadCount = 0;
let idleTimer;
let catchphraseFreq = 1; //minute(s)
let catchphrases = [];

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

    // Création du badge de notification
    const chatBtn = document.querySelector('.chat-toggle-btn');
    if (chatBtn) {
        notificationBadge = document.createElement("div");
        notificationBadge.className = "notification-badge";
        notificationBadge.innerText = "0";
        chatBtn.appendChild(notificationBadge);
    }

    // --- 1. CHARGEMENT DE L'HISTORIQUE DE SESSION ---
    // On utilise sessionStorage au lieu de localStorage
    loadChatHistory();

    // --- 1b. CHARGEMENT DES PHRASES D'ACCROCHE ---
    fetch('catchphrases.json')
        .then(res => res.json())
        .then(data => {
            catchphrases = data;
        })
        .catch(err => console.error("Erreur chargement phrases:", err));

    // --- 2. RESTAURATION DE L'ÉTAT (OUVERT/FERMÉ) ---
    const isChatOpen = sessionStorage.getItem("louvre_chat_open") === "true";
    if (isChatOpen) {
        openChatInterface(); 
    }

    // --- 3. ÉVÉNEMENTS ---
    chatSendBtn.addEventListener("click", () => sendMessage());
    
    chatInput.addEventListener("keydown", (e) => {
        resetIdleTimer();
        if (e.key === "Enter") {
            e.preventDefault();
            sendMessage();
        }
    });

    if (chatExpandBtn) {
        chatExpandBtn.addEventListener("click", toggleExpand);
    }

    resetIdleTimer();

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

        // Si on ouvre, on reset les notifications
        if (isNowOpen) {
            unreadCount = 0;
            updateBadge();
        }

        resetIdleTimer();
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
    
    // Reset notifs
    unreadCount = 0;
    updateBadge();
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
 * Met à jour l'affichage du badge
 */
function updateBadge() {
    if (!notificationBadge) return;
    
    notificationBadge.innerText = unreadCount;
    if (unreadCount > 0) {
        notificationBadge.classList.add("visible");
    } else {
        notificationBadge.classList.remove("visible");
    }
}

/**
 * Ajoute un message visuellement ET le sauvegarde si demandé
 */
function addMessage(text, sender, duration = null, save = true) {
    if (!chatMessagesBox) return;

    const msgContainer = document.createElement("div");
    msgContainer.className = "message " + sender;

    let formattedText = text;

    // --- MISE EN FORME (ORDRE IMPORTANT) ---

    // 1. Gestion des liens <https://...> (Format technique LLM)
    // Le navigateur cache souvent ce qui est entre < > car il croit que c'est une balise.
    formattedText = formattedText.replace(/<(https?:\/\/[^>]+)>/g, '<a href="$1" target="_blank">$1</a>');

    // 2. Gestion des liens Markdown [Texte](URL)
    formattedText = formattedText.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

    // 3. Gestion des liens bruts (ex: "Allez sur https://louvre.fr")
    // Le (?<!...) empêche de casser les liens déjà créés aux étapes 1 et 2 (évite le double lien dans le href)
    formattedText = formattedText.replace(/(?<!href="|">)(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank">$1</a>');

    // 4. Gras (**texte**)
    formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    // 5. Italique (*texte*)
    formattedText = formattedText.replace(/\*(.*?)\*/g, "<em>$1</em>");

    // 6. Sauts de ligne
    formattedText = formattedText.replace(/\n/g, "<br>");

    // ---------------------------------------

    let htmlContent = `<div class="msg-content">${formattedText}</div>`;

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
    resetIdleTimer();
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

    // Préparation de l'historique pour le backend
    const storedHistory = JSON.parse(sessionStorage.getItem("louvre_chat_history")) || [];
    // On retire le dernier élément (le message actuel) pour éviter les doublons
    const historyPayload = storedHistory.slice(0, -1).map(msg => ({
        role: msg.sender === "bot" ? "assistant" : "user",
        content: msg.text
    }));

    try {
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: text, history: historyPayload })
        });

        const data = await response.json();
        const endTime = performance.now();
        const executionTime = endTime - startTime;

        const loader = document.getElementById(loadingId);
        if (loader) loader.remove();

        if (data.response) {
            addMessage(data.response, "bot", executionTime, true);
            
            // Si le chat est fermé, on incrémente le compteur
            const chatWindow = document.getElementById('chatWindow');
            if (chatWindow && !chatWindow.classList.contains('chat-open')) {
                unreadCount++;
                updateBadge();
            }
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

/**
 * Réinitialise le timer d'inactivité (5 minutes)
 */
function resetIdleTimer() {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(triggerIdleMessage, catchphraseFreq * 60 * 1000);
}

/**
 * Envoie un message de relance automatique
 */
function triggerIdleMessage() {
    let message = "Bonjour, comment puis-je vous aider ? Que voulez-vous voir au Louvre ?";
    if (catchphrases.length > 0) {
        message = catchphrases[Math.floor(Math.random() * catchphrases.length)];
    }

    addMessage(message, "bot", null, true);

    const chatWindow = document.getElementById('chatWindow');
    if (chatWindow && !chatWindow.classList.contains('chat-open')) {
        unreadCount++;
        updateBadge();
    }
    resetIdleTimer();
}