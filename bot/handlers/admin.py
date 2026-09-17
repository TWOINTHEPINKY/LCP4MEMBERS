"""Каркас админки: только /admin и навигация по inline-кнопкам."""

from aiogram import F, Router
from aiogram.exceptions import TelegramBadRequest
from aiogram.filters import Command
from aiogram.types import CallbackQuery, Message

from config.settings import get_settings
from keyboards.admin_keyboard import (
    ADMIN_BROADCAST_CALLBACK,
    ADMIN_HOME_CALLBACK,
    ADMIN_SETTINGS_CALLBACK,
    ADMIN_STATS_CALLBACK,
    get_admin_back_keyboard,
    get_admin_keyboard,
)
from texts.admin_messages import (
    ADMIN_BROADCAST_TEXT,
    ADMIN_HOME_TEXT,
    ADMIN_SETTINGS_TEXT,
    ADMIN_STATS_TEXT,
)

router = Router(name="admin")

ADMIN_SCREENS = {
    ADMIN_HOME_CALLBACK: ADMIN_HOME_TEXT,
    ADMIN_BROADCAST_CALLBACK: ADMIN_BROADCAST_TEXT,
    ADMIN_STATS_CALLBACK: ADMIN_STATS_TEXT,
    ADMIN_SETTINGS_CALLBACK: ADMIN_SETTINGS_TEXT,
}


@router.message(Command("admin"))
async def show_admin(message: Message) -> None:
    if not message.from_user or message.from_user.id not in get_settings().admin_ids:
        return

    await message.answer(ADMIN_HOME_TEXT, reply_markup=get_admin_keyboard(), parse_mode=None)


@router.callback_query(F.data.startswith("admin:"))
async def navigate_admin(callback: CallbackQuery) -> None:
    # Проверка выполняется до answer(): не-админ не получает даже ответ на callback.
    if callback.from_user.id not in get_settings().admin_ids:
        return

    await callback.answer()
    text = ADMIN_SCREENS.get(callback.data)
    if text is None or not isinstance(callback.message, Message):
        return

    keyboard = (
        get_admin_keyboard()
        if callback.data == ADMIN_HOME_CALLBACK
        else get_admin_back_keyboard()
    )
    try:
        await callback.message.edit_text(text, reply_markup=keyboard, parse_mode=None)
    except TelegramBadRequest as error:
        # Повторное нажатие уже открытого раздела не является ошибкой навигации.
        if "message is not modified" not in error.message.lower():
            raise
