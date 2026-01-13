import os
from fastapi import APIRouter
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Dict, Optional # Ajout de typage explicite
from mcp.tools.ratp_itinerary import get_itinerary
import re
from chatbot.core import ask_chatbot
from mcp.tools.louvre_horaires import get_horaires_louvre

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC_DIR = os.path.join(BASE_DIR, "public")

router = APIRouter()

SITE_LINKS = {
    "billetterie": {
        "keywords": ["billet", "billetterie", "ticket", "réservation", "acheter", "prix", "tarif"],
        "label": "Billetterie",
        "url": "/public/billetterie.html"
    },
    "plan": {
        "keywords": ["plan", "carte", "map", "parcours", "itinéraire", "visite", "visiter", "guide", "exploration", "découverte"],
        "label": "Plan du musée",
        "url": "/public/plan.html"
    },
    "accessibilite": {
        "keywords": ["accessibilité", "handicap", "accessible", "pmr", "personne à mobilité réduite", "fauteuil roulant", "ascenseur", "rampe", "toilettes", "services"],
        "label": "Accessibilité",
        "url": "/public/accessibilite.html"
    },
    "horaires": {
        "keywords": ["horaire", "horaires", "ouverture", "fermeture", "heure", "temps", "planning", "jours", "semaine", "week-end", "vacances", "fermé"],
        "label": "Horaires",
        "url": "/public/horaires.html"
    }
}

# Modèle de données attendu (JSON venant du JS)
class ChatRequest(BaseModel):
    message: str
    history: List[Dict[str, str]] = []

@router.get("/")
async def read_root():
    return FileResponse(os.path.join(PUBLIC_DIR, "index.html"))

@router.post("/api/chat")
def chat(request: ChatRequest):
    msg = request.message.lower()

    # 🧭 DÉTECTION TRAJET RATP
    match = re.search(r"(aller de|trajet de|comment aller de)\s(.+?)\s(à|vers)\s(.+)", msg)

    if match:
        start = match.group(2)
        end = match.group(4)

        itin = get_itinerary(start, end)

        if "steps" in itin:
            text = f"🚇 Itinéraire le plus rapide<br>⏱ {itin['duration']} min<br><br>"
            text += "<br>".join(itin["steps"])
            return {"response": text}
    
    user_message = request.message.lower()

    # 1️⃣ Réponse du LLM en priorité
    response = ask_chatbot(request.message, request.history)

    # 2️⃣ Ajout du lien utile à la fin du message
    for key, data in SITE_LINKS.items():
        if any(k in user_message for k in data["keywords"]):
            response += (
                "<br><br>🔗 <strong>Ressource utile :</strong><br>"
                f"<a href='{data['url']}' class='chat-link'>{data['label']}</a>"
            )
            break

    return {"response": response}

@router.get("/health")
def health():
    return {"status": "ok"}