"""Server-to-server auth calls. Never send the internal secret to Telegram."""

import asyncio

from aiohttp import ClientError, ClientSession
from aiogram.types import User

from config.settings import get_settings


class AuthBackendError(Exception):
    def __init__(self, code: str):
        self.code = code
        super().__init__(code)


async def submit_decision(session: ClientSession, login_id: str, user: User, approve: bool) -> None:
    settings = get_settings()
    action = "confirm" if approve else "cancel"
    try:
        async with session.post(
            f"{settings.backend_internal_url}/auth/bot/{action}",
            headers={"X-Bot-Internal-Secret": settings.bot_internal_secret},
            json={"login_id": login_id, "id": user.id, "username": user.username,
                  "first_name": user.first_name, "last_name": user.last_name},
            allow_redirects=False,
        ) as response:
            if response.status == 200:
                return
            code = "unavailable"
            if response.status in (404, 409, 410):
                data = await response.json()
                known = {"unknown_challenge", "expired", "consumed", "approved", "cancelled"}
                if isinstance(data, dict) and isinstance(data.get("detail"), str) and data["detail"] in known:
                    code = data["detail"]
            raise AuthBackendError(code)
    except (ClientError, asyncio.TimeoutError, ValueError):
        # Do not propagate exception text, request URLs, headers or user data.
        raise AuthBackendError("unavailable") from None
