import requests
import json
import time
import subprocess

OLLAMA_URL = "http://localhost:11434/api/chat"
MODEL_NAME = "gpt-oss:120b-cloud"

def ask_llm(messages: list[dict]) -> str:
    print(json.dumps(messages, indent=2))
    payload = {
        "model": MODEL_NAME,
        "messages": messages,
        "stream": False
    }

    start_time = time.perf_counter()

    try:
        response = requests.post(OLLAMA_URL, json=payload, timeout=120)
        response.raise_for_status()
        data = response.json()
        return data["message"]["content"]
    except Exception as e:
        return f"Erreur lors de l'appel au LLM : {str(e)}"
    finally:
        elapsed = time.perf_counter() - start_time
        print(f"Temps d'exécution LLM : {elapsed:.2f} s")


def ensure_model():
    try:
        subprocess.run(
            ["ollama", "show", MODEL_NAME],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=True
        )
    except subprocess.CalledProcessError:
        print(f"Téléchargement du modèle {MODEL_NAME}...")
        subprocess.run(
            ["ollama", "pull", MODEL_NAME],
            check=True
        )