import logging

from aiogram import F, Router
from aiogram.enums import ChatType
from aiogram.filters import CommandStart
from aiogram.filters.command import CommandObject
from aiogram.types import BufferedInputFile, Message

from config.settings import WELCOME_IMAGE
from handlers.auth import prompt_login
from keyboards.main_keyboard import get_main_keyboard
from texts.messages import PRIVATE_CHAT_ONLY, welcome_message

logger = logging.getLogger(__name__)
router = Router(name="start")


@router.message(CommandStart(), F.chat.type == ChatType.PRIVATE)
async def start(message: Message, command: CommandObject) -> None:
    if command.args and command.args.startswith("login_"):
        await prompt_login(message, command.args.removeprefix("login_"))
        return
    first_name = message.from_user.first_name if message.from_user else None
    caption = welcome_message(first_name)
    keyboard = get_main_keyboard()

    try:
        photo = BufferedInputFile(WELCOME_IMAGE.read_bytes(), filename=WELCOME_IMAGE.name)
    except OSError:
        logger.warning(
            "Не удалось прочитать assets/images/welcome_placeholder.png; "
            "приветствие будет отправлено без фотографии."
        )
        await message.answer(caption, reply_markup=keyboard, parse_mode=None)
        return

    await message.answer_photo(photo, caption=caption, reply_markup=keyboard, parse_mode=None)


@router.message(CommandStart())
async def start_outside_private_chat(message: Message) -> None:
    await message.answer(PRIVATE_CHAT_ONLY)
