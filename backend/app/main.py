import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Загружаем переменные из файла .env
load_dotenv()

from .auth import router as auth_router

app = FastAPI(title="LCP4Members Backend")

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

# Подключаем роутер авторизации (тот самый /auth/telegram)
app.include_router(auth_router)

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