import os
import hashlib
import hmac
import time
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from jose import jwt

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Модель данных, которую присылает фронтенд после нажатия кнопки в Telegram
class TelegramAuthRequest(BaseModel):
    id: int
    first_name: str
    username: str | None = None
    auth_date: int
    hash: str

def verify_telegram_auth(data: dict, bot_token: str) -> bool:
    """
    Официальный алгоритм Telegram для проверки подлинности данных виджета.
    """
    # 1. Исключаем поле 'hash' из проверки
    check_data = {k: v for k, v in data.items() if k != "hash"}
    
    # 2. Сортируем ключи по алфавиту
    sorted_keys = sorted(check_data.keys())
    
    # 3. Создаем строку вида "key=value\nkey2=value2"
    data_check_string = "\n".join([f"{k}={check_data[k]}" for k in sorted_keys])
    
    # 4. Создаем секретный ключ = SHA256 от токена бота
    secret_key = hashlib.sha256(bot_token.encode()).digest()
    
    # 5. Вычисляем HMAC-SHA256
    calculated_hash = hmac.new(
        secret_key, 
        data_check_string.encode(), 
        hashlib.sha256
    ).hexdigest()
    
    # 6. Сравниваем с присланным хешем
    if calculated_hash != data.get("hash"):
        return False
        
    # 7. (Опционально) Проверяем, что данные не старше 24 часов
    if time.time() - int(data.get("auth_date", 0)) > 86400:
        return False
        
    return True

@router.post("/telegram")
async def telegram_login(user_data: TelegramAuthRequest):
    bot_token = os.getenv("BOT_TOKEN")
    jwt_secret = os.getenv("JWT_SECRET", "fallback_secret")
    
    if not bot_token:
        raise HTTPException(status_code=500, detail="BOT_TOKEN не настроен на сервере")

    # Преобразуем pydantic модель в словарь для проверки
    data_dict = user_data.model_dump()
    
    # ПРОВЕРКА ПОДЛИННОСТИ
    if not verify_telegram_auth(data_dict, bot_token):
        raise HTTPException(status_code=401, detail="Неверная подпись Telegram. Доступ запрещен.")

    # Если все ок, генерируем JWT токен на 30 дней
    expire = datetime.utcnow() + timedelta(days=30)
    to_encode = {
        "sub": str(user_data.id),          # ID пользователя Telegram
        "username": user_data.username,
        "first_name": user_data.first_name,
        "exp": expire
    }
    
    token = jwt.encode(to_encode, jwt_secret, algorithm="HS256")
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user_data.id,
            "username": user_data.username,
            "first_name": user_data.first_name
        }
    }