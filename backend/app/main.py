from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from .auth import router as auth_router
from .challenges import InMemoryChallengeStore
from .settings import get_settings
from .support import SupportStore, router as support_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_dotenv(Path(__file__).resolve().parent.parent / ".env")
    app.state.settings = get_settings()
    app.state.challenge_store = InMemoryChallengeStore()
    app.state.support_store = SupportStore()
    yield


app = FastAPI(title="LCP4Members Backend", lifespan=lifespan)

# Настройка CORS: разрешаем запросы с локальной разработки и с вашего GitHub Pages
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",          # Для тестов на вашем компьютере
        "https://twointhepinky.github.io" # Ваш реальный домен GitHub Pages
    ],
    allow_credentials=True,
    allow_methods=["*"],                   # Разрешаем все методы (GET, POST, OPTIONS и т.д.)
    allow_headers=["*"],                   # Разрешаем все заголовки
)

# Сохраняем Widget endpoint и подключаем авторизацию через бота.
app.include_router(auth_router)
app.include_router(support_router)

@app.get("/health")
async def health():
    return {"status": "ok", "message": "Backend is running"}

@app.get("/plans")
async def get_plans():
    return [
        {"id": "basic", "name": "Basic", "price": 299, "devices": 2, "bypass": False},
        {"id": "plus", "name": "Plus", "price": 699, "devices": 5, "bypass": True},
        {"id": "premium", "name": "Pro Plus", "price": 1199, "devices": 10, "bypass": True},
    ]
