import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from mcp.server import call_tool 

# Initialisation de l'application
app = FastAPI(title="Louvre Bot API")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC_DIR = os.path.join(BASE_DIR, "public")

app.mount("/public", StaticFiles(directory=PUBLIC_DIR), name="public")

@app.get("/")
async def read_root():
    return FileResponse(os.path.join(PUBLIC_DIR, "index.html"))

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/api/horaires")
def horaires():
    return call_tool("get_horaires_louvre")

if __name__ == "__main__":
    import uvicorn
    print("🏛️  Serveur du Musée lancé sur http://localhost:8000/public/index.html")
    uvicorn.run(app, host="0.0.0.0", port=8000)