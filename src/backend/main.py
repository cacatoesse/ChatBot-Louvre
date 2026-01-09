from fastapi import FastAPI
import sys
from pathlib import Path

# Permet d'importer le dossier mcp/ depuis backend/
PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.append(str(PROJECT_ROOT))

from mcp.server import call_tool  # noqa: E402

app = FastAPI(title="Louvre Bot API")

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/api/horaires")
def horaires():
    return call_tool("get_horaires_louvre")

