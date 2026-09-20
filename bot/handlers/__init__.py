"""Общий Router объединяет обработчики и безопасно журналирует ошибки."""

import logging

from aiogram import Router
from aiogram.types import ErrorEvent

from handlers.about import router as about_router
from handlers.admin import router as admin_router
from handlers.auth import router as auth_router
from handlers.start import router as start_router
from handlers.support import router as support_router

logger = logging.getLogger(__name__)
router = Router(name="lizard")
router.include_routers(start_router, auth_router, support_router, about_router, admin_router)


@router.error()
async def handle_error(event: ErrorEvent) -> bool:
    # Без Update, данных пользователя и текста исключения с параметрами запроса.
    logger.error("Ошибка обработки события (%s).", type(event.exception).__name__)
    return True
