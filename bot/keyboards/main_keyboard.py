from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, MenuButtonWebApp, WebAppInfo

from config.settings import get_settings
from keyboards.about_keyboard import ABOUT_CALLBACK
from texts.messages import ABOUT_BUTTON, CABINET_BUTTON, CONNECT_BUTTON, SUPPORT_BUTTON


def get_main_keyboard() -> InlineKeyboardMarkup:
    settings = get_settings()
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text=CONNECT_BUTTON,
                    web_app=WebAppInfo(url=settings.web_url("login")),
                    style="success",
                )
            ],
            [
                InlineKeyboardButton(
                    text=SUPPORT_BUTTON,
                    web_app=WebAppInfo(url=settings.web_url("support")),
                    style="success",
                ),
                InlineKeyboardButton(
                    text=ABOUT_BUTTON,
                    style="success",
                    callback_data=ABOUT_CALLBACK),
            ],
        ]
    )


def get_menu_button() -> MenuButtonWebApp:
    return MenuButtonWebApp(
        text=CABINET_BUTTON,
        web_app=WebAppInfo(url=get_settings().web_url("app")),
    )
