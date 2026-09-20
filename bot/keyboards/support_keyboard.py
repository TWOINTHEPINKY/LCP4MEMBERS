from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup


def get_support_keyboard(ticket_id: int) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="✍️ Ответить", callback_data=f"support:reply:{ticket_id}")],
            [InlineKeyboardButton(text="✅ Закрыть", callback_data=f"support:close:{ticket_id}")],
        ]
    )
