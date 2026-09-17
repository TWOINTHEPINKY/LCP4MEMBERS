import re

from aiohttp import ClientSession
from aiogram import F, Router
from aiogram.enums import ChatType
from aiogram.exceptions import TelegramBadRequest
from aiogram.types import CallbackQuery, InlineKeyboardButton, InlineKeyboardMarkup, Message

from auth_client import AuthBackendError, submit_decision

router = Router(name="auth")
LOGIN_ID = re.compile(r"[A-Za-z0-9_-]{32}")


async def prompt_login(message: Message, login_id: str) -> None:
    if not LOGIN_ID.fullmatch(login_id):
        await message.answer("Некорректная ссылка входа. Начните вход заново на сайте.")
        return
    keyboard = InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text="✅ Да, войти", callback_data=f"auth:yes:{login_id}"),
        InlineKeyboardButton(text="❌ Нет", callback_data=f"auth:no:{login_id}"),
    ]])
    await message.answer(
        "Подтвердить вход в LCP?\n\n"
        "Подтверждайте только вход, который вы сами начали на сайте. "
        "После подтверждения вернитесь в ту же вкладку браузера.",
        reply_markup=keyboard, parse_mode=None,
    )


@router.callback_query(F.data.startswith("auth:"))
async def decide_login(callback: CallbackQuery, auth_http: ClientSession) -> None:
    message = callback.message
    if (not isinstance(message, Message) or message.chat.type != ChatType.PRIVATE
            or message.chat.id != callback.from_user.id):
        await callback.answer("Подтвердите вход в личном чате с ботом.", show_alert=True)
        return
    parts = (callback.data or "").split(":")
    if len(parts) != 3 or parts[1] not in ("yes", "no") or not LOGIN_ID.fullmatch(parts[2]):
        await callback.answer("Некорректная ссылка входа.", show_alert=True)
        return
    await callback.answer()
    approve = parts[1] == "yes"
    try:
        await submit_decision(auth_http, parts[2], callback.from_user, approve)
        text = ("Вход подтверждён. Вернитесь в ту же вкладку сайта — кабинет откроется автоматически."
                if approve else "Вход отменён. При необходимости начните заново на сайте.")
    except AuthBackendError as error:
        messages = {
            "unknown_challenge": "Ссылка не найдена. Начните вход заново на сайте.",
            "expired": "Ссылка истекла. Начните вход заново на сайте.",
            "consumed": "Эта ссылка уже использована. Вернитесь на сайт.",
            "approved": "Вход уже подтверждён. Вернитесь в исходную вкладку сайта.",
            "cancelled": "Вход уже отменён. Начните заново на сайте.",
        }
        text = messages.get(error.code)
        if text is None:
            # Keep the buttons: a network/configuration failure must allow retry.
            await message.answer("Сервис входа недоступен. Попробуйте нажать кнопку ещё раз чуть позже.")
            return
    try:
        await message.edit_text(text, reply_markup=None, parse_mode=None)
    except TelegramBadRequest:
        # A double click may have already edited this message.
        pass
