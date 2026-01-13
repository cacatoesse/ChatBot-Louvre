import os
import webbrowser
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from llm.ollama_client import ensure_model
from mcp.server import router

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC_DIR = os.path.join(BASE_DIR, "public")

app = FastAPI(title="Louvre Bot API")

app.mount("/public", StaticFiles(directory=PUBLIC_DIR), name="public")
app.include_router(router)

if __name__ == "__main__":
    import uvicorn

    ensure_model()
    print("🏛️  Serveur du Musée lancé sur http://localhost:8000/public/index.html")
    webbrowser.open("http://localhost:8000/public/index.html")
    uvicorn.run(app, host="0.0.0.0", port=8000)