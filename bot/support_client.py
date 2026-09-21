"""Internal support API calls from the Telegram bot."""

import asyncio

from aiohttp import ClientError, ClientSession

from config.settings import get_settings


class SupportBackendError(Exception):
    pass


async def _request(session: ClientSession, method: str, path: str, **kwargs) -> dict:
    settings = get_settings()
    try:
        async with session.request(
            method,
            f"{settings.backend_internal_url}{path}",
            headers={"X-Bot-Internal-Secret": settings.bot_internal_secret},
            allow_redirects=False,
            **kwargs,
        ) as response:
            if response.status != 200:
                raise SupportBackendError
            data = await response.json()
            if not isinstance(data, dict):
                raise SupportBackendError
            return data
    except (ClientError, OSError, asyncio.TimeoutError, ValueError):
        raise SupportBackendError from None


async def get_pending_tickets(session: ClientSession) -> list[dict]:
    data = await _request(session, "GET", "/support/internal/pending")
    tickets = data.get("tickets")
    return tickets if isinstance(tickets, list) else []


async def reply_to_ticket(session: ClientSession, ticket_id: int, admin_id: int, message: str) -> dict:
    return await _request(
        session,
        "POST",
        f"/support/internal/tickets/{ticket_id}/messages",
        json={"admin_id": admin_id, "message": message},
    )


async def acknowledge_notification(session: ClientSession, ticket_id: int, updated_at: str) -> dict:
    return await _request(
        session, "POST", f"/support/internal/tickets/{ticket_id}/notified",
        json={"updated_at": updated_at},
    )


async def close_ticket(session: ClientSession, ticket_id: int) -> dict:
    return await _request(session, "POST", f"/support/internal/tickets/{ticket_id}/close")
