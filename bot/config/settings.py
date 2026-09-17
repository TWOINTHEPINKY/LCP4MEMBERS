"""Настройки читаются только из .env рядом с main.py."""

from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
import re
from urllib.parse import urlsplit

from dotenv import dotenv_values

BASE_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = BASE_DIR / ".env"
WELCOME_IMAGE = BASE_DIR / "assets" / "images" / "welcome_placeholder.png"


class ConfigurationError(ValueError):
    """Ошибка конфигурации, которую можно показать без раскрытия секретов."""


@dataclass(frozen=True)
class Settings:
    bot_token: str = field(repr=False)
    web_app_url: str
    support_telegram_url: str
    bot_internal_secret: str = field(repr=False)
    backend_internal_url: str = "http://127.0.0.1:8000"
    admin_ids: frozenset[int] = field(default_factory=frozenset, repr=False)

    def web_url(self, page: str) -> str:
        return f"{self.web_app_url}/#/{page.lstrip('/')}"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    # Не используем os.getenv: старый токен из окружения не подменит .env.
    # interpolate=False также исключает подстановки секретов из окружения.
    try:
        values = dotenv_values(ENV_FILE, encoding="utf-8", interpolate=False)
    except (OSError, UnicodeError):
        raise ConfigurationError("Не удалось прочитать корневой .env в UTF-8.") from None

    bot_token = (values.get("BOT_TOKEN") or "").strip()
    if not bot_token:
        raise ConfigurationError("В корневом .env отсутствует BOT_TOKEN. Заполните его и повторите запуск.")

    bot_internal_secret = (values.get("BOT_INTERNAL_SECRET") or "").strip()
    if len(bot_internal_secret) < 32 or bot_internal_secret == bot_token:
        raise ConfigurationError(
            "Укажите в bot/.env отдельный BOT_INTERNAL_SECRET длиной от 32 символов, "
            "совпадающий с backend/.env. Не используйте BOT_TOKEN."
        )
    backend_internal_url = (values.get("BACKEND_INTERNAL_URL") or "http://127.0.0.1:8000").strip().rstrip("/")
    try:
        backend_url = urlsplit(backend_internal_url)
        valid_backend_url = (
            backend_url.scheme in ("http", "https") and bool(backend_url.hostname)
            and backend_url.username is None and backend_url.password is None
            and not backend_url.query and not backend_url.fragment
            and not any(char.isspace() for char in backend_internal_url)
            and "\\" not in backend_internal_url
        )
        backend_url.port
    except ValueError:
        valid_backend_url = False
    if not valid_backend_url:
        raise ConfigurationError("BACKEND_INTERNAL_URL в bot/.env должен быть HTTP(S)-адресом backend без query/fragment.")

    web_app_url = (values.get("WEB_APP_URL") or "").strip().rstrip("/")
    url_error = (
        "Укажите WEB_APP_URL в корневом .env: полный HTTPS-адрес сайта "
        "без имени файла, логина, пароля, query-параметров и #fragment."
    )
    try:
        parsed = urlsplit(web_app_url)
        valid_url = (
            parsed.scheme == "https"
            and bool(parsed.hostname)
            and parsed.username is None
            and parsed.password is None
            and not parsed.query
            and not parsed.fragment
            and not any(char.isspace() for char in web_app_url)
            and "\\" not in web_app_url
            and not parsed.path.lower().endswith((".html", ".htm"))
        )
        parsed.port  # Проверяем также формат и диапазон порта.
    except ValueError:
        raise ConfigurationError(url_error) from None
    if not valid_url:
        raise ConfigurationError(url_error)

    support_telegram_url = (values.get("SUPPORT_TELEGRAM_URL") or "").strip()
    if not re.fullmatch(r"https://t\.me/[A-Za-z0-9_]+", support_telegram_url):
        raise ConfigurationError(
            "Укажите SUPPORT_TELEGRAM_URL в корневом .env "
            "в формате https://t.me/<username> (без @ и дополнительных параметров)."
        )

    raw_admin_ids = (values.get("ADMIN_IDS") or "").strip()
    admin_ids: frozenset[int] = frozenset()
    if raw_admin_ids:
        try:
            parts = [part.strip() for part in raw_admin_ids.split(",")]
            if any(not re.fullmatch(r"[0-9]+", part) for part in parts):
                raise ValueError
            admin_ids = frozenset(int(part) for part in parts)
            if any(user_id <= 0 for user_id in admin_ids):
                raise ValueError
        except ValueError:
            raise ConfigurationError(
                "ADMIN_IDS в корневом .env должен содержать положительные числовые "
                "Telegram user_id через запятую. Оставьте поле пустым, чтобы отключить админку."
            ) from None

    return Settings(
        bot_token=bot_token,
        web_app_url=web_app_url,
        support_telegram_url=support_telegram_url,
        bot_internal_secret=bot_internal_secret,
        backend_internal_url=backend_internal_url,
        admin_ids=admin_ids,
    )
