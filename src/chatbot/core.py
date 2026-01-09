from llm.ollama_client import ask_llm
from agent.guardrails import is_insulting
from agent.prompts import SYSTEM_PROMPT

def ask_chatbot(user_message: str) -> str:
    # Vérifie si le message est insultant
    if is_insulting(user_message):
        return "Merci de rester respectueux."

    # Prépare le contexte pour le LLM
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_message}
    ]

    # Appelle ton LLM local
    return ask_llm(messages)
