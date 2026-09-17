"""Replace ChallengeStore with a shared, atomic Redis/Supabase implementation later."""

import asyncio
import hashlib
import hmac
import secrets
import time
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Literal, Protocol

ChallengeStatus = Literal["pending", "approved", "cancelled", "expired", "consumed"]


class ChallengeError(Exception):
    def __init__(self, code: str, status_code: int):
        self.code = code
        self.status_code = status_code
        super().__init__(code)


@dataclass
class Challenge:
    browser_token_hash: bytes = field(repr=False)
    expires_at: float
    status: ChallengeStatus = "pending"
    user: dict | None = field(default=None, repr=False)


class ChallengeStore(Protocol):
    ttl: int

    async def create(self) -> tuple[str, str]: ...

    async def decide(self, login_id: str, user: dict, approve: bool) -> None: ...

    async def consume(self, login_id: str, browser_token: str) -> tuple[ChallengeStatus, dict | None]: ...


class InMemoryChallengeStore:
    """Single process only. Every state transition (including consumption) is atomic."""

    def __init__(self, ttl: int = 300, max_entries: int = 10000, clock: Callable[[], float] = time.monotonic):
        self.ttl = ttl
        self.max_entries = max_entries
        self._clock = clock
        self._entries: dict[str, Challenge] = {}
        self._lock = asyncio.Lock()

    async def create(self) -> tuple[str, str]:
        async with self._lock:
            now = self._clock()
            # Keep terminal/expired entries for another TTL to explain stale links.
            # Lazy eviction + a hard bound prevent unbounded memory growth.
            self._entries = {key: item for key, item in self._entries.items() if item.expires_at + self.ttl > now}
            if len(self._entries) >= self.max_entries:
                raise ChallengeError("capacity_exceeded", 429)
            login_id = secrets.token_urlsafe(24)  # 32 chars, fits Telegram payloads.
            while login_id in self._entries:
                login_id = secrets.token_urlsafe(24)
            browser_token = secrets.token_urlsafe(32)
            self._entries[login_id] = Challenge(
                hashlib.sha256(browser_token.encode()).digest(), now + self.ttl,
            )
            return login_id, browser_token

    def _get(self, login_id: str) -> Challenge:
        challenge = self._entries.get(login_id)
        if challenge is None:
            raise ChallengeError("unknown_challenge", 404)
        if self._clock() >= challenge.expires_at + self.ttl:
            del self._entries[login_id]
            raise ChallengeError("unknown_challenge", 404)
        if self._clock() >= challenge.expires_at and challenge.status in ("pending", "approved"):
            challenge.status = "expired"
            challenge.user = None
        return challenge

    async def decide(self, login_id: str, user: dict, approve: bool) -> None:
        async with self._lock:
            challenge = self._get(login_id)
            if challenge.status != "pending":
                raise ChallengeError(challenge.status, 410 if challenge.status == "expired" else 409)
            # Only the first decision wins; identity can never be replaced.
            challenge.user = dict(user) if approve else None
            challenge.status = "approved" if approve else "cancelled"

    async def consume(self, login_id: str, browser_token: str) -> tuple[ChallengeStatus, dict | None]:
        async with self._lock:
            challenge = self._get(login_id)
            if not hmac.compare_digest(challenge.browser_token_hash, hashlib.sha256(browser_token.encode()).digest()):
                raise ChallengeError("invalid_browser_token", 403)
            if challenge.status == "consumed":
                raise ChallengeError("consumed", 409)
            if challenge.status == "approved":
                user = challenge.user
                challenge.status = "consumed"
                challenge.user = None
                return "approved", user
            return challenge.status, None
