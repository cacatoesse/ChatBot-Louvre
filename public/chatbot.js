/**
 * CHATBOT DU MUSÉE DU LOUVRE
 * Gère l'interface, l'historique de session, les appels API et la relance automatique.
 */

// --- CONFIGURATION ---
const CONFIG = {
    IDLE_TIMEOUT: 120, // Temps d'inactivité en SECONDES avant relance
    API_URL: "/api/chat",
    STORAGE_KEYS: {
        HISTORY: "louvre_chat_history",
        STATE: "louvre_chat_open",
        BADGE: "louvre_unread_count",
        LAST_ACTION: "louvre_last_interaction"
    }
};

// --- VARIABLES GLOBALES ---
let elements = {};      // Stockera les éléments du DOM (input, bouton, etc.)
let idleTimer;          // Variable pour le minuteur technique
let unreadCount = 0;    // Compteur de messages non lus
let catchphrases = [];  // Phrases d'accroche chargées depuis le JSON

/**
 * 1. INITIALISATION
 * Appelé une fois que le HTML du chatbot est injecté dans la page.
 */
function initChatbot() {
    console.log("🚀 Démarrage du chatbot...");

    // Récupération des éléments du DOM
    elements = {
        input: document.querySelector(".chat-input-area input"),
        sendBtn: document.querySelector(".send-btn"),
        messagesBox: document.querySelector(".chat-messages"),
        expandBtn: document.getElementById("expandBtn"),
        chatWindow: document.getElementById("chatWindow"),
        toggleBtn: document.querySelector(".chat-toggle-btn")
    };

    if (!elements.input || !elements.sendBtn || !elements.messagesBox) {
        console.error("❌ Erreur : Éléments du chatbot introuvables.");
        return;
    }

    // Création du badge de notification (rond rouge)
    createNotificationBadge();

    // Chargement des données existantes (Session)
    loadChatHistory();
    restoreChatState();
    loadCatchphrases();

    // Configuration des événements (Clics, Entrée)
    setupEventListeners();

    // Gestion du Minuteur (Reprise intelligente au changement de page)
    restoreIdleTimer();

    console.log("✅ Chatbot prêt.");
}

/**
 * 2. GESTION DES ÉVÉNEMENTS
 */
function setupEventListeners() {
    // Envoi par clic
    elements.sendBtn.addEventListener("click", () => sendMessage());

    // Envoi par touche Entrée
    elements.input.addEventListener("keydown", (e) => {
        resetIdleTimer(); // L'écriture compte comme une activité
        if (e.key === "Enter") {
            e.preventDefault();
            sendMessage();
        }
    });

    // Bouton Agrandir / Réduire
    if (elements.expandBtn) {
        elements.expandBtn.addEventListener("click", toggleExpand);
    }
}

/**
 * 3. LOGIQUE D'INTERFACE (OUVERTURE / FERMETURE)
 */

// Ouvre ou ferme la fenêtre de chat
function toggleChat() {
    if (!elements.chatWindow) return;

    const isOpen = elements.chatWindow.classList.toggle('chat-open');
    elements.toggleBtn.classList.toggle('btn-active');
    
    // Sauvegarde l'état pour les autres pages
    sessionStorage.setItem(CONFIG.STORAGE_KEYS.STATE, isOpen);

    if (isOpen) {
        resetBadge();
    }
    
    // Une interaction utilisateur réinitialise le timer
    resetIdleTimer();
}

// Force l'ouverture (utilisé au chargement si c'était déjà ouvert)
function openChatInterface() {
    elements.chatWindow.classList.add('chat-open');
    elements.toggleBtn.classList.add('btn-active');
    resetBadge();
}

// Mode "Grand Écran"
function toggleExpand() {
    elements.chatWindow.classList.toggle('expanded');
    const isExpanded = elements.chatWindow.classList.contains('expanded');
    
    // Change l'icône selon l'état
    elements.expandBtn.innerHTML = isExpanded ? "⤡" : "⤢";
    elements.expandBtn.title = isExpanded ? "Réduire" : "Agrandir";
}

/**
 * 4. GESTION DES NOTIFICATIONS (BADGE)
 */
function createNotificationBadge() {
    if (!elements.toggleBtn) return;
    
    const badge = document.createElement("div");
    badge.className = "notification-badge";
    badge.id = "notifBadge";
    badge.innerText = "0";
    elements.toggleBtn.appendChild(badge);

    // Restaure le nombre précédent
    unreadCount = parseInt(sessionStorage.getItem(CONFIG.STORAGE_KEYS.BADGE) || "0", 10);
    updateBadgeDisplay();
}

function updateBadgeDisplay() {
    const badge = document.getElementById("notifBadge");
    if (!badge) return;

    badge.innerText = unreadCount;
    if (unreadCount > 0) badge.classList.add("visible");
    else badge.classList.remove("visible");

    sessionStorage.setItem(CONFIG.STORAGE_KEYS.BADGE, unreadCount);
}

function resetBadge() {
    unreadCount = 0;
    updateBadgeDisplay();
}

/**
 * 5. GESTION DES MESSAGES (AFFICHAGE & FORMATAGE)
 */
function addMessage(text, sender, duration = null, save = true) {
    const msgContainer = document.createElement("div");
    msgContainer.className = "message " + sender;

    // --- Formatage du texte (Markdown & Liens) ---
    let formattedText = text
        // Liens techniques <http...>
        .replace(/<(https?:\/\/[^>]+)>/g, '<a href="$1" target="_blank">$1</a>')
        // Liens Markdown [Texte](URL)
        .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
        // Liens bruts (http...)
        .replace(/(?<!href="|">)(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank">$1</a>')
        // Gras (**texte**)
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        // Italique (*texte*)
        .replace(/\*(.*?)\*/g, "<em>$1</em>")
        // Sauts de ligne
        .replace(/\n/g, "<br>");

    // Construction du HTML
    let htmlContent = `<div class="msg-content">${formattedText}</div>`;

    // Ajout du temps d'exécution (si fourni)
    if (duration !== null) {
        const seconds = (duration / 1000).toFixed(2);
        htmlContent += `<span class="exec-time">Généré en ${seconds}s</span>`;
    }

    msgContainer.innerHTML = htmlContent;
    elements.messagesBox.appendChild(msgContainer);
    elements.messagesBox.scrollTop = elements.messagesBox.scrollHeight;

    // Sauvegarde en session
    if (save) {
        saveMessageToSession(text, sender, duration);
    }
}

/**
 * 6. LOGIQUE DE COMMUNICATION (API)
 */
async function sendMessage() {
    resetIdleTimer(); // On reset le timer car l'utilisateur est actif
    
    const text = elements.input.value.trim();
    if (!text) return;

    // 1. Afficher le message utilisateur
    addMessage(text, "user", null, true);
    elements.input.value = ""; 

    // 2. Afficher l'indicateur de chargement
    const loadingId = showLoader();

    const startTime = performance.now();

    try {
        // Préparation de l'historique pour le LLM (sans le message qu'on vient d'envoyer)
        const historyPayload = getHistoryForAPI();

        // 3. Appel API
        const response = await fetch(CONFIG.API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: text, history: historyPayload })
        });

        const data = await response.json();
        const executionTime = performance.now() - startTime;

        removeLoader(loadingId);

        // 4. Traitement de la réponse
        if (data.response) {
            addMessage(data.response, "bot", executionTime, true);
            incrementBadgeIfClosed();
        } else {
            addMessage("Désolé, je n'ai pas compris.", "bot", executionTime, true);
        }

    } catch (err) {
        removeLoader(loadingId);
        console.error("Erreur API:", err);
        addMessage("❌ Erreur de connexion.", "bot", null, true);
    }
}

/**
 * 7. GESTION DU TIMER D'INACTIVITÉ
 * Relance le bot si l'utilisateur ne fait rien pendant X secondes.
 */
function resetIdleTimer() {
    if (idleTimer) clearTimeout(idleTimer);

    // On stocke l'heure de la dernière action
    sessionStorage.setItem(CONFIG.STORAGE_KEYS.LAST_ACTION, Date.now());

    // On lance le timer
    idleTimer = setTimeout(triggerIdleMessage, CONFIG.IDLE_TIMEOUT * 1000);
}

// Logique intelligente : calcule le temps restant au chargement de la page
function restoreIdleTimer() {
    const lastInteraction = sessionStorage.getItem(CONFIG.STORAGE_KEYS.LAST_ACTION);
    
    if (lastInteraction) {
        const elapsed = Date.now() - parseInt(lastInteraction, 10);
        const remaining = (CONFIG.IDLE_TIMEOUT * 1000) - elapsed;

        if (remaining <= 0) {
            triggerIdleMessage(); // Le temps est déjà écoulé
        } else {
            // On attend seulement le temps restant
            idleTimer = setTimeout(triggerIdleMessage, remaining);
        }
    } else {
        resetIdleTimer(); // Première visite
    }
}

// Fonction déclenchée quand le temps est écoulé
function triggerIdleMessage() {
    // Choix d'une phrase aléatoire
    let message = "Bonjour, puis-je vous aider ?";
    if (catchphrases.length > 0) {
        message = catchphrases[Math.floor(Math.random() * catchphrases.length)];
    }

    // Envoi du message (Note: pas de vérification anti-doublon comme demandé)
    addMessage(message, "bot", null, true);
    incrementBadgeIfClosed();

    // On relance le cycle
    resetIdleTimer();
}

/**
 * 8. FONCTIONS UTILITAIRES & PERSISTANCE
 */

function loadChatHistory() {
    const history = JSON.parse(sessionStorage.getItem(CONFIG.STORAGE_KEYS.HISTORY)) || [];
    if (history.length > 0) elements.messagesBox.innerHTML = ""; 
    history.forEach(msg => addMessage(msg.text, msg.sender, msg.duration, false));
}

function saveMessageToSession(text, sender, duration) {
    let history = JSON.parse(sessionStorage.getItem(CONFIG.STORAGE_KEYS.HISTORY)) || [];
    history.push({ text, sender, duration });
    sessionStorage.setItem(CONFIG.STORAGE_KEYS.HISTORY, JSON.stringify(history));
}

function restoreChatState() {
    const isOpen = sessionStorage.getItem(CONFIG.STORAGE_KEYS.STATE) === "true";
    if (isOpen) openChatInterface();
}

function loadCatchphrases() {
    fetch('catchphrases.json')
        .then(res => res.json())
        .then(data => { catchphrases = data; })
        .catch(() => console.warn("Fichier catchphrases.json non trouvé ou vide."));
}

function showLoader() {
    const id = "loading-" + Date.now();
    const div = document.createElement("div");
    div.className = "message bot";
    div.id = id;
    div.innerHTML = `<div class="msg-content"><div class="typing-indicator"><span></span><span></span><span></span></div></div>`;
    elements.messagesBox.appendChild(div);
    elements.messagesBox.scrollTop = elements.messagesBox.scrollHeight;
    return id;
}

function removeLoader(id) {
    const loader = document.getElementById(id);
    if (loader) loader.remove();
}

function getHistoryForAPI() {
    const stored = JSON.parse(sessionStorage.getItem(CONFIG.STORAGE_KEYS.HISTORY)) || [];
    // On prend tout sauf le dernier message (qui est celui qu'on vient d'ajouter visuellement)
    return stored.slice(0, -1).map(msg => ({
        role: msg.sender === "bot" ? "assistant" : "user",
        content: msg.text
    }));
}

function incrementBadgeIfClosed() {
    if (elements.chatWindow && !elements.chatWindow.classList.contains('chat-open')) {
        unreadCount++;
        updateBadgeDisplay();
    }
}