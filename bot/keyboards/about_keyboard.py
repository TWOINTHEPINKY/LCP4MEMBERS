from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup

from texts.messages import BACK_BUTTON

ABOUT_CALLBACK = "lizard:about"
BACK_CALLBACK = "lizard:back"


def get_about_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[[InlineKeyboardButton(
            text=BACK_BUTTON,
            style="success",
            callback_data=BACK_CALLBACK),
        ],
    ],    
)
