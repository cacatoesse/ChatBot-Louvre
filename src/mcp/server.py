import os
from fastapi import APIRouter
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Dict, Optional # Ajout de typage explicite

from chatbot.core import ask_chatbot
from mcp.tools.louvre_horaires import get_horaires_louvre

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC_DIR = os.path.join(BASE_DIR, "public")

router = APIRouter()

# Modèle de données attendu (JSON venant du JS)
class ChatRequest(BaseModel):
    message: str
    history: List[Dict[str, str]] = []

def call_tool(tool_name: str):
    if tool_name == "get_horaires_louvre":
        return get_horaires_louvre()
    return {"error": f"Tool inconnu: {tool_name}"}

@router.get("/")
async def read_root():
    return FileResponse(os.path.join(PUBLIC_DIR, "index.html"))

@router.post("/api/chat")
def chat(request: ChatRequest):
    response = ask_chatbot(request.message, request.history)
    return {"response": response}

@router.get("/health")
def health():
    return {"status": "ok"}

@router.get("/api/horaires")
def horaires():
    return call_tool("get_horaires_louvre")