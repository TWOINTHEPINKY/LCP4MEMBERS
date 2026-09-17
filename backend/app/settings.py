"""Validated server-only configuration; no development secret fallbacks."""

import os
import re
from dataclasses import dataclass, field


@dataclass(frozen=True)
class Settings:
    bot_token: str = field(repr=False)
    jwt_secret: str = field(repr=False)
    bot_internal_secret: str = field(repr=False)
    bot_username: str = "connorsvpn_bot"


def get_settings() -> Settings:
    values = {}
    for name in ("BOT_TOKEN", "JWT_SECRET", "BOT_INTERNAL_SECRET"):
        value = os.getenv(name, "").strip()
        if not value:
            raise RuntimeError(f"Configuration error: {name} is required")
        values[name] = value
    for name in ("JWT_SECRET", "BOT_INTERNAL_SECRET"):
        if len(values[name]) < 32:
            raise RuntimeError(f"Configuration error: {name} must be at least 32 characters")
    if len(set(values.values())) != 3:
        raise RuntimeError("Configuration error: BOT_TOKEN, JWT_SECRET and BOT_INTERNAL_SECRET must differ")
    username = os.getenv("BOT_USERNAME", "connorsvpn_bot").strip().lstrip("@")
    if not re.fullmatch(r"[A-Za-z0-9_]{5,32}", username):
        raise RuntimeError("Configuration error: BOT_USERNAME is invalid")
    return Settings(values["BOT_TOKEN"], values["JWT_SECRET"], values["BOT_INTERNAL_SECRET"], username)
