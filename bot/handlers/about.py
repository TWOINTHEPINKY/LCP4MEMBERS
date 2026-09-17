import logging

from aiogram import F, Router
from aiogram.exceptions import TelegramBadRequest
from aiogram.types import CallbackQuery, Message

from keyboards.about_keyboard import ABOUT_CALLBACK, BACK_CALLBACK, get_about_keyboard
from texts.messages import ABOUT_TEXT, BACK_DELETE_FAILED, MESSAGE_UNAVAILABLE

logger = logging.getLogger(__name__)
router = Router(name="about")


@router.callback_query(F.data == ABOUT_CALLBACK)
async def show_about(callback: CallbackQuery) -> None:
    if not isinstance(callback.message, Message):
        await callback.answer(MESSAGE_UNAVAILABLE, show_alert=True)
        return

    await callback.answer()
    await callback.message.answer(ABOUT_TEXT, reply_markup=get_about_keyboard(), parse_mode=None)


@router.callback_query(F.data == BACK_CALLBACK)
async def go_back(callback: CallbackQuery) -> None:
    if not isinstance(callback.message, Message):
        await callback.answer(MESSAGE_UNAVAILABLE, show_alert=True)
        return

    await callback.answer()
    try:
        # Удаляется только сообщение, на котором нажали «Назад».
        await callback.message.delete()
    except TelegramBadRequest:
        logger.warning("Telegram не разрешил удалить сообщение «О нас».")
        await callback.message.answer(BACK_DELETE_FAILED)
