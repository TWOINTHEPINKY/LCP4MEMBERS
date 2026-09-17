"""Точка входа Telegram-бота LIZARD."""

import asyncio
import logging

from aiohttp import ClientSession, ClientTimeout
from aiogram import Bot, Dispatcher
from aiogram.exceptions import TelegramAPIError, TelegramUnauthorizedError
from aiogram.types import BotCommand, BotCommandScopeDefault
from aiogram.utils.token import TokenValidationError

from config.settings import ConfigurationError, get_settings
from handlers import router
from keyboards.main_keyboard import get_menu_button
from texts.messages import START_COMMAND_DESCRIPTION

logger = logging.getLogger(__name__)


async def main() -> None:
    settings = get_settings()
    dispatcher = Dispatcher(disable_fsm=True)
    dispatcher.include_router(router)

    logger.info("Запуск LIZARD Bot")
    async with Bot(token=settings.bot_token) as bot, ClientSession(timeout=ClientTimeout(total=10)) as auth_http:
        # Заменяем default-список команд; /admin остаётся доступен через его handler.
        await bot.set_my_commands(
            commands=[BotCommand(command="start", description=START_COMMAND_DESCRIPTION)],
            scope=BotCommandScopeDefault(),
            language_code="",
        )
        # Без chat_id устанавливается меню по умолчанию для личных чатов.
        await bot.set_chat_menu_button(menu_button=get_menu_button())
        logger.info("Кнопка «Кабинет» настроена; запуск polling")
        await dispatcher.start_polling(
            bot,
            allowed_updates=dispatcher.resolve_used_update_types(),
            close_bot_session=False,  # Сессию закрывает async with, в том числе при ошибке.
            auth_http=auth_http,
        )


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    logging.getLogger("aiogram.event").setLevel(logging.WARNING)
    try:
        asyncio.run(main())
    except ConfigurationError as error:
        logger.error("%s", error)
        raise SystemExit(1) from None
    except (TokenValidationError, TelegramUnauthorizedError):
        logger.error("BOT_TOKEN недействителен. Укажите новый токен в корневом .env.")
        raise SystemExit(1) from None
    except TelegramAPIError as error:
        logger.error(
            "Ошибка Telegram API (%s). Проверьте сеть, WEB_APP_URL и настройки бота.",
            type(error).__name__,
        )
        raise SystemExit(1) from None
    except (KeyboardInterrupt, asyncio.CancelledError):
        pass
    except Exception as error:
        # Не печатаем объект исключения: он может содержать запрос с секретами.
        logger.error("Не удалось запустить LIZARD Bot (%s).", type(error).__name__)
        raise SystemExit(1) from None
    finally:
        logger.info("LIZARD Bot остановлен")
