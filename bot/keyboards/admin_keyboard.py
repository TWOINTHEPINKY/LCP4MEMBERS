"""Клавиатуры административной панели и её callback namespace."""

from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup

from texts.admin_messages import (
    ADMIN_BACK_BUTTON,
    ADMIN_BROADCAST_BUTTON,
    ADMIN_SETTINGS_BUTTON,
    ADMIN_STATS_BUTTON,
)

ADMIN_HOME_CALLBACK = "admin:home"
ADMIN_BROADCAST_CALLBACK = "admin:broadcast"
ADMIN_STATS_CALLBACK = "admin:stats"
ADMIN_SETTINGS_CALLBACK = "admin:settings"


def get_admin_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text=ADMIN_BROADCAST_BUTTON, callback_data=ADMIN_BROADCAST_CALLBACK)],
            [InlineKeyboardButton(text=ADMIN_STATS_BUTTON, callback_data=ADMIN_STATS_CALLBACK)],
            [InlineKeyboardButton(text=ADMIN_SETTINGS_BUTTON, callback_data=ADMIN_SETTINGS_CALLBACK)],
        ]
    )


def get_admin_back_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text=ADMIN_BACK_BUTTON, callback_data=ADMIN_HOME_CALLBACK)]
        ]
    )
