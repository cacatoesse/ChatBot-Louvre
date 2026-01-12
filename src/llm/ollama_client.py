import requests
import json

OLLAMA_URL = "http://localhost:11434/api/chat"
MODEL_NAME = "llama3"

def ask_llm(messages: list[dict]) -> str:
    payload = {
        "model": MODEL_NAME,
        "messages": messages,
        "stream": False
    }

    try:
        response = requests.post(OLLAMA_URL, json=payload, timeout=120)
        response.raise_for_status()
        data = response.json()
        return data["message"]["content"]
    except Exception as e:
        return f"Erreur lors de l'appel au LLM : {str(e)}"
