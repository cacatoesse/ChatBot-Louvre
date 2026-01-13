from llm.ollama_client import ask_llm
from agent.guardrails import is_insulting
from agent.prompts import SYSTEM_PROMPT
from mcp.tools.louvre_horaires import get_horaires_louvre

# CONFIGURATION : Nombre de messages max à garder en mémoire (glissant)
MAX_HISTORY_LENGTH = 5

def ask_chatbot(user_message: str, history: list[dict]) -> str:
    # 1. Vérifie si le message est insultant
    if is_insulting(user_message):
        return "Merci de rester respectueux."

    # 2. Détection d'intention (Tools)
    additional_context = ""
    keywords_horaires = ["horaire", "ouverture", "fermeture", "ouvert", "fermé"]
    
    if any(k in user_message.lower() for k in keywords_horaires):
        print("🤖 Tool activé : Récupération des horaires...")
        tool_result = get_horaires_louvre()
        if "data" in tool_result:
            additional_context = f"\n\n[INFO LIVE] : {tool_result['data']}."

    # 3. Gestion de l'historique (Sliding Window)
    # On ne garde que les N derniers éléments de la liste fournie par le frontend
    recent_history = history[-MAX_HISTORY_LENGTH:] if history else []

    # 4. Construction de la mémoire complète pour le LLM
    full_conversation = []
    
    # A. Le Prompt Système (toujours en premier)
    full_conversation.append({
        "role": "system", 
        "content": SYSTEM_PROMPT + additional_context
    })

    # B. L'historique récent (User + Assistant mélangés)
    for msg in recent_history:
        print("Message : ",msg)
        # On vérifie que le message a bien un contenu pour éviter les erreurs
        if msg.get("content"):
            full_conversation.append({
                "role": msg.get("role", "user"), # Par défaut user si manquant
                "content": msg.get("content")
            })

    # C. Le message actuel de l'utilisateur
    full_conversation.append({
        "role": "user", 
        "content": user_message
    })

    # 5. Envoi au LLM
    return ask_llm(full_conversation)