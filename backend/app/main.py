from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import socketio
from app.socket_manager import sio
from app.database import engine
from app import models
from app.routers import auth, sessions, problems

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="2buddy API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://your-vercel-url.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(sessions.router)
app.include_router(problems.router)

socket_app = socketio.ASGIApp(sio, other_asgi_app=app)


@app.get("/")
def root():
    return {"message": "2buddy API is running"}