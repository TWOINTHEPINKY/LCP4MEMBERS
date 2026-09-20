import hashlib
import hmac
import re
import time
from datetime import datetime, timedelta, timezone
from typing import Annotated
from urllib.parse import parse_qsl

from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pydantic import BaseModel, Field, ValidationError

from .challenges import ChallengeError, ChallengeStore
from .settings import Settings

router = APIRouter(prefix="/auth", tags=["Authentication"])
bearer = HTTPBearer(auto_error=False)
LoginId = Annotated[str, Field(pattern=r"^[A-Za-z0-9_-]{32}$")]


class TelegramUser(BaseModel):
    id: int = Field(gt=0, strict=True)
    first_name: str = Field(min_length=1, max_length=256)
    username: str | None = Field(default=None, max_length=256)
    last_name: str | None = Field(default=None, max_length=256)
    photo_url: str | None = Field(default=None, max_length=2048)


class TelegramAuthRequest(TelegramUser):
    photo_url: str | None = None
    auth_date: int
    hash: str = Field(pattern=r"^[a-fA-F0-9]{64}$")


class TelegramWebAppRequest(BaseModel):
    init_data: str = Field(strict=True, min_length=1, max_length=16384)


class BotDecisionRequest(TelegramUser):
    login_id: LoginId


def settings_for(request: Request) -> Settings:
    return request.app.state.settings


def store_for(request: Request) -> ChallengeStore:
    return request.app.state.challenge_store


def no_store(response: Response) -> None:
    response.headers["Cache-Control"] = "no-store"
    response.headers["Pragma"] = "no-cache"


def verify_telegram_auth(data: dict, bot_token: str) -> bool:
    check_data = {k: v for k, v in data.items() if k != "hash" and v is not None}
    data_check_string = "\n".join(f"{key}={check_data[key]}" for key in sorted(check_data))
    secret_key = hashlib.sha256(bot_token.encode()).digest()
    calculated_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(calculated_hash.encode(), str(data.get("hash", "")).encode()):
        return False
    try:
        age = time.time() - int(data.get("auth_date", 0))
    except (TypeError, ValueError):
        return False
    return -30 <= age <= 86400


def verify_telegram_webapp(init_data: str, bot_token: str) -> TelegramUser | None:
    """Verify the signed raw query string before decoding or trusting its user."""
    try:
        if re.search(r"%(?![0-9a-fA-F]{2})", init_data):
            return None
        pairs = parse_qsl(init_data, keep_blank_values=True, strict_parsing=True,
                          errors="strict", max_num_fields=32)
        data = dict(pairs)
        # Reject ambiguous fields instead of silently keeping the last occurrence.
        if len(data) != len(pairs) or any(
            not re.fullmatch(r"[A-Za-z0-9_]+", key) or "\n" in value or "\r" in value
            for key, value in pairs
        ):
            return None
        received_hash = data.pop("hash", "")
        if not re.fullmatch(r"[a-f0-9]{64}", received_hash):
            return None
        check_string = "\n".join(f"{key}={data[key]}" for key in sorted(data))
        secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
        expected_hash = hmac.new(secret_key, check_string.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected_hash, received_hash):
            return None
        if not re.fullmatch(r"[0-9]+", data.get("auth_date", "")):
            return None
        age = time.time() - int(data["auth_date"])
        if not -30 <= age <= 86400:
            return None
        return TelegramUser.model_validate_json(data["user"])
    except (ValueError, KeyError, OverflowError, RecursionError):
        return None


def token_response(user: TelegramUser, settings: Settings) -> dict:
    now = datetime.now(timezone.utc)
    token = jwt.encode(
        {"sub": str(user.id), "username": user.username, "first_name": user.first_name,
         "last_name": user.last_name, "photo_url": user.photo_url,
         "iat": now, "exp": now + timedelta(days=30)},
        settings.jwt_secret, algorithm="HS256",
    )
    user_data = user.model_dump()
    if user_data.get("photo_url") is None:
        user_data.pop("photo_url", None)
    return {"access_token": token, "token_type": "bearer", "user": user_data}


def require_bot_secret(
    settings: Annotated[Settings, Depends(settings_for)],
    secret: Annotated[str | None, Header(alias="X-Bot-Internal-Secret")] = None,
) -> None:
    if not secret or not hmac.compare_digest(secret.encode(), settings.bot_internal_secret.encode()):
        raise HTTPException(status_code=401, detail="invalid_internal_secret")


@router.post("/telegram")
async def telegram_login(user_data: TelegramAuthRequest, response: Response,
                         settings: Annotated[Settings, Depends(settings_for)]):
    no_store(response)
    if not verify_telegram_auth(user_data.model_dump(exclude_none=True), settings.bot_token):
        raise HTTPException(status_code=401, detail="Неверная подпись Telegram. Доступ запрещен.")
    return token_response(TelegramUser.model_validate(user_data.model_dump()), settings)


@router.post("/telegram-webapp")
async def telegram_webapp_login(request: Request, response: Response,
                                settings: Annotated[Settings, Depends(settings_for)]):
    no_store(response)
    # Validate manually so malformed bodies also get a safe 401, without Pydantic
    # echoing credential material in a default request-validation response.
    try:
        payload = TelegramWebAppRequest.model_validate(await request.json())
        user = verify_telegram_webapp(payload.init_data, settings.bot_token)
    except (ValueError, RecursionError):
        user = None
    if user is None:
        raise HTTPException(401, detail="invalid_telegram_webapp_data",
                            headers={"Cache-Control": "no-store", "Pragma": "no-cache"})
    return token_response(user, settings)


@router.post("/bot/start")
async def bot_start(response: Response, settings: Annotated[Settings, Depends(settings_for)],
                    store: Annotated[ChallengeStore, Depends(store_for)]):
    no_store(response)
    try:
        login_id, browser_token = await store.create()
    except ChallengeError as error:
        raise HTTPException(error.status_code, detail=error.code) from None
    return {
        "login_id": login_id,
        # This proof stays in the initiating browser and never enters the deep link.
        "browser_token": browser_token,
        "telegram_url": f"https://t.me/{settings.bot_username}?start=login_{login_id}",
        "expires_in": store.ttl,
    }


@router.post("/bot/confirm", dependencies=[Depends(require_bot_secret)])
async def bot_confirm(data: BotDecisionRequest, store: Annotated[ChallengeStore, Depends(store_for)]):
    try:
        await store.decide(data.login_id, data.model_dump(exclude={"login_id"}), approve=True)
    except ChallengeError as error:
        raise HTTPException(error.status_code, detail=error.code) from None
    return {"status": "approved"}


@router.post("/bot/cancel", dependencies=[Depends(require_bot_secret)])
async def bot_cancel(data: BotDecisionRequest, store: Annotated[ChallengeStore, Depends(store_for)]):
    try:
        await store.decide(data.login_id, data.model_dump(exclude={"login_id"}), approve=False)
    except ChallengeError as error:
        raise HTTPException(error.status_code, detail=error.code) from None
    return {"status": "cancelled"}


@router.get("/bot/status/{login_id}")
async def bot_status(login_id: LoginId, response: Response,
                     settings: Annotated[Settings, Depends(settings_for)],
                     store: Annotated[ChallengeStore, Depends(store_for)],
                     browser_token: Annotated[str | None, Header(alias="X-Login-Token")] = None):
    no_store(response)
    if not browser_token:
        raise HTTPException(status_code=403, detail="invalid_browser_token")
    try:
        status, user = await store.consume(login_id, browser_token)
    except ChallengeError as error:
        raise HTTPException(error.status_code, detail=error.code) from None
    if status == "approved":
        return {"status": status, **token_response(TelegramUser.model_validate(user), settings)}
    return {"status": status}


@router.get("/me", response_model=TelegramUser)
async def me(response: Response, settings: Annotated[Settings, Depends(settings_for)],
             credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)]):
    no_store(response)
    unauthorized = HTTPException(401, detail="invalid_token", headers={"WWW-Authenticate": "Bearer"})
    if credentials is None:
        raise unauthorized
    try:
        claims = jwt.decode(credentials.credentials, settings.jwt_secret, algorithms=["HS256"],
                            options={"require_exp": True, "require_sub": True})
        user = TelegramUser(id=int(claims["sub"]), username=claims.get("username"),
                            first_name=claims["first_name"], last_name=claims.get("last_name"),
                            photo_url=claims.get("photo_url"))
        if user.photo_url is None:
            return JSONResponse(
                content=user.model_dump(exclude={"photo_url"}),
                headers={"Cache-Control": "no-store", "Pragma": "no-cache"},
            )
        return user
    except (JWTError, ValidationError, ValueError, TypeError, KeyError, OverflowError):
        raise unauthorized from None
