import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response
from fastapi.security import HTTPAuthorizationCredentials
from jose import JWTError, jwt
from pydantic import BaseModel, Field

from .auth import TelegramUser, bearer, no_store, require_bot_secret, settings_for

router = APIRouter(prefix="/support", tags=["Support"])


class SupportTicketCreate(BaseModel):
    category: Literal["connection", "payment", "account", "other"]
    message: str = Field(min_length=1, max_length=4000)


class SupportMessageCreate(BaseModel):
    message: str = Field(min_length=1, max_length=4000)


class InternalSupportMessage(BaseModel):
    admin_id: int = Field(gt=0)
    message: str = Field(min_length=1, max_length=4000)


class SupportStore:
    def __init__(self, path: str | None = None):
        default_path = str(Path(__file__).resolve().parent.parent / "data" / "support.sqlite3")
        configured_path = path or os.getenv("SUPPORT_DB_PATH", default_path)
        self.path = configured_path
        if self.path != ":memory:":
            Path(self.path).parent.mkdir(parents=True, exist_ok=True)
        with self._connect() as connection:
            connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS support_tickets (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    username TEXT,
                    first_name TEXT NOT NULL,
                    last_name TEXT,
                    category TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'open',
                    notified_at TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS support_messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ticket_id INTEGER NOT NULL REFERENCES support_tickets(id),
                    author_kind TEXT NOT NULL,
                    author_id INTEGER NOT NULL,
                    author_name TEXT NOT NULL,
                    message TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS support_messages_ticket_idx
                    ON support_messages(ticket_id, id);
                """
            )

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.path, timeout=10)
        connection.row_factory = sqlite3.Row
        return connection

    @staticmethod
    def _now() -> str:
        return datetime.now(timezone.utc).isoformat()

    @staticmethod
    def _ticket(row: sqlite3.Row) -> dict:
        return {
            "id": row["id"], "user_id": row["user_id"], "username": row["username"],
            "first_name": row["first_name"], "last_name": row["last_name"],
            "category": row["category"], "status": row["status"],
            "created_at": row["created_at"], "updated_at": row["updated_at"],
        }

    @staticmethod
    def _message(row: sqlite3.Row) -> dict:
        return {
            "id": row["id"], "author_kind": row["author_kind"],
            "author_id": row["author_id"], "author_name": row["author_name"],
            "message": row["message"], "created_at": row["created_at"],
        }

    def create_ticket(self, user: TelegramUser, category: str, message: str) -> dict:
        now = self._now()
        with self._connect() as connection:
            cursor = connection.execute(
                """INSERT INTO support_tickets
                   (user_id, username, first_name, last_name, category, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (user.id, user.username, user.first_name, user.last_name, category, now, now),
            )
            ticket_id = cursor.lastrowid
            connection.execute(
                """INSERT INTO support_messages
                   (ticket_id, author_kind, author_id, author_name, message, created_at)
                   VALUES (?, 'user', ?, ?, ?, ?)""",
                (ticket_id, user.id, user.first_name, message, now),
            )
            row = connection.execute("SELECT * FROM support_tickets WHERE id = ?", (ticket_id,)).fetchone()
        return self.get_ticket(ticket_id, user.id) if row else {}

    def list_tickets(self, user_id: int) -> list[dict]:
        with self._connect() as connection:
            rows = connection.execute(
                "SELECT * FROM support_tickets WHERE user_id = ? ORDER BY updated_at DESC", (user_id,)
            ).fetchall()
        return [self._ticket(row) for row in rows]

    def get_ticket(self, ticket_id: int, user_id: int | None = None) -> dict | None:
        with self._connect() as connection:
            query = "SELECT * FROM support_tickets WHERE id = ?"
            params: tuple[object, ...] = (ticket_id,)
            if user_id is not None:
                query += " AND user_id = ?"
                params += (user_id,)
            ticket = connection.execute(query, params).fetchone()
            if ticket is None:
                return None
            messages = connection.execute(
                "SELECT * FROM support_messages WHERE ticket_id = ? ORDER BY id", (ticket_id,)
            ).fetchall()
        result = self._ticket(ticket)
        result["messages"] = [self._message(message) for message in messages]
        return result

    def add_user_message(self, ticket_id: int, user: TelegramUser, message: str) -> dict | None:
        now = self._now()
        with self._connect() as connection:
            ticket = connection.execute(
                "SELECT * FROM support_tickets WHERE id = ? AND user_id = ?", (ticket_id, user.id)
            ).fetchone()
            if ticket is None:
                return None
            connection.execute(
                """INSERT INTO support_messages
                   (ticket_id, author_kind, author_id, author_name, message, created_at)
                   VALUES (?, 'user', ?, ?, ?, ?)""",
                (ticket_id, user.id, user.first_name, message, now),
            )
            connection.execute(
                "UPDATE support_tickets SET status = 'open', updated_at = ?, notified_at = NULL WHERE id = ?",
                (now, ticket_id),
            )
        return self.get_ticket(ticket_id, user.id)

    def pending_tickets(self) -> list[dict]:
        with self._connect() as connection:
            rows = connection.execute(
                "SELECT * FROM support_tickets WHERE notified_at IS NULL AND status = 'open' "
                "ORDER BY id LIMIT 20"
            ).fetchall()
            now = self._now()
            for row in rows:
                connection.execute("UPDATE support_tickets SET notified_at = ? WHERE id = ?", (now, row["id"]))
        return [self.get_ticket(row["id"]) for row in rows]

    def add_admin_message(self, ticket_id: int, admin_id: int, message: str) -> dict | None:
        now = self._now()
        with self._connect() as connection:
            ticket = connection.execute("SELECT * FROM support_tickets WHERE id = ?", (ticket_id,)).fetchone()
            if ticket is None:
                return None
            connection.execute(
                """INSERT INTO support_messages
                   (ticket_id, author_kind, author_id, author_name, message, created_at)
                   VALUES (?, 'admin', ?, 'Support', ?, ?)""",
                (ticket_id, admin_id, message, now),
            )
            connection.execute("UPDATE support_tickets SET status = 'waiting_user', updated_at = ? WHERE id = ?", (now, ticket_id))
        return self.get_ticket(ticket_id)

    def close_ticket(self, ticket_id: int) -> dict | None:
        with self._connect() as connection:
            cursor = connection.execute("UPDATE support_tickets SET status = 'closed', updated_at = ? WHERE id = ?", (self._now(), ticket_id))
            if cursor.rowcount == 0:
                return None
        return self.get_ticket(ticket_id)


def store_for(request: Request) -> SupportStore:
    return request.app.state.support_store


def current_user(
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
) -> TelegramUser:
    if credentials is None:
        raise HTTPException(401, detail="invalid_token", headers={"WWW-Authenticate": "Bearer"})
    settings = settings_for(request)
    try:
        claims = jwt.decode(credentials.credentials, settings.jwt_secret, algorithms=["HS256"], options={"require_exp": True, "require_sub": True})
        return TelegramUser(id=int(claims["sub"]), username=claims.get("username"), first_name=claims["first_name"], last_name=claims.get("last_name"))
    except (JWTError, ValueError, TypeError, KeyError):
        raise HTTPException(401, detail="invalid_token", headers={"WWW-Authenticate": "Bearer"}) from None


@router.post("/tickets")
async def create_ticket(data: SupportTicketCreate, response: Response, user: Annotated[TelegramUser, Depends(current_user)], store: Annotated[SupportStore, Depends(store_for)]):
    no_store(response)
    return store.create_ticket(user, data.category, data.message)


@router.get("/tickets")
async def list_tickets(response: Response, user: Annotated[TelegramUser, Depends(current_user)], store: Annotated[SupportStore, Depends(store_for)]):
    no_store(response)
    return {"tickets": store.list_tickets(user.id)}


@router.get("/tickets/{ticket_id}")
async def get_ticket(ticket_id: int, response: Response, user: Annotated[TelegramUser, Depends(current_user)], store: Annotated[SupportStore, Depends(store_for)]):
    no_store(response)
    ticket = store.get_ticket(ticket_id, user.id)
    if ticket is None:
        raise HTTPException(404, detail="ticket_not_found")
    return ticket


@router.post("/tickets/{ticket_id}/messages")
async def add_message(ticket_id: int, data: SupportMessageCreate, response: Response, user: Annotated[TelegramUser, Depends(current_user)], store: Annotated[SupportStore, Depends(store_for)]):
    no_store(response)
    ticket = store.add_user_message(ticket_id, user, data.message)
    if ticket is None:
        raise HTTPException(404, detail="ticket_not_found")
    return ticket


@router.get("/internal/pending", dependencies=[Depends(require_bot_secret)])
async def pending_tickets(response: Response, store: Annotated[SupportStore, Depends(store_for)]):
    no_store(response)
    return {"tickets": store.pending_tickets()}


@router.post("/internal/tickets/{ticket_id}/messages", dependencies=[Depends(require_bot_secret)])
async def add_admin_message(ticket_id: int, data: InternalSupportMessage, response: Response, store: Annotated[SupportStore, Depends(store_for)]):
    no_store(response)
    ticket = store.add_admin_message(ticket_id, data.admin_id, data.message)
    if ticket is None:
        raise HTTPException(404, detail="ticket_not_found")
    return ticket


@router.post("/internal/tickets/{ticket_id}/close", dependencies=[Depends(require_bot_secret)])
async def close_ticket(ticket_id: int, response: Response, store: Annotated[SupportStore, Depends(store_for)]):
    no_store(response)
    ticket = store.close_ticket(ticket_id)
    if ticket is None:
        raise HTTPException(404, detail="ticket_not_found")
    return ticket
