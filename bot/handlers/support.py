import logging

from aiogram import F, Router
from aiogram.enums import ChatType
from aiogram.exceptions import TelegramBadRequest
from aiogram.types import CallbackQuery, Message
from aiohttp import ClientSession

from config.settings import get_settings
from keyboards.support_keyboard import get_support_keyboard
from support_client import SupportBackendError, close_ticket, reply_to_ticket

logger = logging.getLogger(__name__)
router = Router(name="support")
reply_context: dict[int, int] = {}


def is_admin(user_id: int | None) -> bool:
    return user_id is not None and user_id in get_settings().admin_ids


def is_reply_message(message: Message) -> bool:
    return is_admin(message.from_user.id if message.from_user else None) and bool(
        message.from_user and message.from_user.id in reply_context
    )


@router.callback_query(F.data.startswith("support:"))
async def support_action(callback: CallbackQuery, support_http: ClientSession) -> None:
    if not is_admin(callback.from_user.id):
        return
    parts = (callback.data or "").split(":")
    if len(parts) != 3 or not parts[2].isdigit():
        await callback.answer("Некорректный запрос.", show_alert=True)
        return
    ticket_id = int(parts[2])
    await callback.answer()
    if parts[1] == "reply":
        reply_context[callback.from_user.id] = ticket_id
        await callback.message.answer(
            f"Введите ответ для обращения #{ticket_id}. Для отмены отправьте /cancel.",
            parse_mode=None,
        )
        return
    if parts[1] != "close":
        return
    try:
        await close_ticket(support_http, ticket_id)
        reply_context.pop(callback.from_user.id, None)
        if isinstance(callback.message, Message):
            await callback.message.edit_reply_markup(reply_markup=None)
            await callback.message.answer(f"Обращение #{ticket_id} закрыто.", parse_mode=None)
    except SupportBackendError:
        await callback.message.answer("Не удалось закрыть обращение. Попробуйте ещё раз.", parse_mode=None)


@router.message(F.chat.type == ChatType.PRIVATE, F.text, is_reply_message)
async def send_support_reply(message: Message, support_http: ClientSession) -> None:
    if not message.from_user or message.text.startswith("/"):
        return
    ticket_id = reply_context.get(message.from_user.id)
    if ticket_id is None:
        return
    try:
        await reply_to_ticket(support_http, ticket_id, message.from_user.id, message.text)
    except SupportBackendError:
        await message.answer("Не удалось отправить ответ. Попробуйте ещё раз.", parse_mode=None)
        return
    reply_context.pop(message.from_user.id, None)
    await message.answer(f"Ответ по обращению #{ticket_id} отправлен пользователю.", parse_mode=None)


async def notify_ticket(bot, ticket: dict) -> None:
    ticket_id = ticket.get("id")
    user_name = " ".join(filter(None, [ticket.get("first_name"), ticket.get("last_name")])) or "Без имени"
    username = f"@{ticket['username']}" if ticket.get("username") else "без username"
    category = {
        "connection": "Подключение", "payment": "Оплата", "account": "Аккаунт", "other": "Другое",
    }.get(ticket.get("category"), "Другое")
    messages = ticket.get("messages") or []
    first_message = next((item.get("message") for item in messages if item.get("author_kind") == "user"), "")
    text = (
        f"🆕 Новое обращение #{ticket_id}\n\n"
        f"Пользователь: {user_name}\n"
        f"Telegram: {username}\n"
        f"ID: {ticket.get('user_id')}\n"
        f"Категория: {category}\n\n{first_message}"
    )
    for admin_id in get_settings().admin_ids:
        try:
            await bot.send_message(admin_id, text, reply_markup=get_support_keyboard(ticket_id), parse_mode=None)
        except TelegramBadRequest:
            logger.warning("Не удалось отправить обращение администратору.")
