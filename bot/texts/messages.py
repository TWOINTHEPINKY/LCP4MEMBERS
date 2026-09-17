"""Все сообщения и подписи кнопок бота редактируются здесь."""

WELCOME_TEXT = (
    "Мы здесь больше не говорим о лечении болезней. "
    "Мы говорим о стремлении к совершенству!"
)
WELCOME_WITH_NAME = "Привет, {first_name}!"
WELCOME_WITHOUT_NAME = "Привет!"

ABOUT_TEXT = (
    "LIZARD — VPN-сервис, созданный вокруг простой идеи: подключение должно просто работать.\n\n"
    "Мы строим сервис с упором на скорость, стабильность и устойчивость соединения, "
    "оставляя всю сложную техническую часть за экраном.\n\n"
    "Вы выбираете нужную локацию — остальным занимается LIZARD."
)
PRIVATE_CHAT_ONLY = "Чтобы открыть LIZARD, отправьте /start в личном чате с ботом."
MESSAGE_UNAVAILABLE = "Это сообщение больше недоступно. Отправьте /start."
BACK_DELETE_FAILED = (
    "Не удалось удалить сообщение «О нас». Главное меню осталось выше в чате. "
    "При необходимости его можно открыть снова командой /start."
)

CONNECT_BUTTON = "🦎 Подключить"
SUPPORT_BUTTON = "💬 Поддержка"
ABOUT_BUTTON = "ℹ️ О нас"
BACK_BUTTON = "🔙 Назад"
CABINET_BUTTON = "Кабинет"
START_COMMAND_DESCRIPTION = "Главное меню"


def welcome_message(first_name: str | None) -> str:
    name = (first_name or "").strip()
    greeting = WELCOME_WITH_NAME.format(first_name=name) if name else WELCOME_WITHOUT_NAME
    return f"{greeting}\n\n{WELCOME_TEXT}"
