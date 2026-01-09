import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Initialisation de l'application
app = FastAPI()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC_DIR = os.path.join(BASE_DIR, "public")

app.mount("/public", StaticFiles(directory=PUBLIC_DIR), name="public")

@app.get("/")
async def read_root():
    return FileResponse(os.path.join(PUBLIC_DIR, "index.html"))


if __name__ == "__main__":
    import uvicorn
    print("🏛️  Serveur du Musée lancé sur http://localhost:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)