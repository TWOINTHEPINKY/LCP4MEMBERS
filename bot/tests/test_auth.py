"""Run from bot/: .venv/bin/python -m unittest discover -s tests -v. No Telegram calls."""
import asyncio
import secrets
import unittest
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

from aiogram import Bot, Dispatcher
from aiogram.client.session.base import BaseSession
from aiogram.methods import AnswerCallbackQuery, EditMessageText, GetMe, SendMessage, SendPhoto
from aiogram.types import CallbackQuery, Chat, Message, MessageEntity, Update, User

from auth_client import AuthBackendError, submit_decision
from config.settings import ConfigurationError, Settings, get_settings
from handlers import router
from keyboards.about_keyboard import ABOUT_CALLBACK
from keyboards.main_keyboard import get_main_keyboard, get_menu_button


class RecordingSession(BaseSession):
    def __init__(self):
        super().__init__()
        self.calls = []

    async def close(self):
        pass

    async def make_request(self, bot, method, timeout=None):
        self.calls.append(method)
        if isinstance(method, GetMe):
            return User(id=987654, is_bot=True, first_name="Test bot", username="test_bot")
        return True

    async def stream_content(self, url, **kwargs):
        yield b""


class BotFlowTests(unittest.IsolatedAsyncioTestCase):
    @classmethod
    def setUpClass(cls):
        cls.dispatcher = Dispatcher(disable_fsm=True)
        cls.dispatcher.include_router(router)

    def setUp(self):
        self.session = RecordingSession()
        self.bot = Bot(token="987654:" + secrets.token_urlsafe(32), session=self.session)
        self.user = User(id=123456, is_bot=False, first_name="Test", username="tester")
        self.settings = Settings(bot_token=self.bot.token, bot_internal_secret=secrets.token_urlsafe(32),
            web_app_url="https://twointhepinky.github.io/LCP4MEMBERS",
            support_telegram_url="https://t.me/support_test", admin_ids=frozenset({123456}))
        self.enterContext(patch("keyboards.main_keyboard.get_settings", return_value=self.settings))

    def message(self, text="/start", chat_id=123456):
        return Message(message_id=10, date=datetime.now(timezone.utc), from_user=self.user,
            chat=Chat(id=chat_id, type="private"), text=text,
            entities=[MessageEntity(type="bot_command", offset=0, length=6)])

    async def feed_message(self, text):
        await self.dispatcher.feed_update(self.bot, Update(update_id=1, message=self.message(text)))

    async def feed_callback(self, data, message=None):
        callback = CallbackQuery(id="test_callback", from_user=self.user, chat_instance="test",
            data=data, message=message or self.message())
        await self.dispatcher.feed_update(self.bot, Update(update_id=2, callback_query=callback), auth_http=MagicMock())

    async def test_plain_start_keeps_welcome_photo(self):
        await self.feed_message("/start")
        self.assertTrue(any(isinstance(call, SendPhoto) for call in self.session.calls))

    async def test_support_and_about_still_work(self):
        keyboard = get_main_keyboard()
        self.assertEqual(keyboard.inline_keyboard[1][0].url, self.settings.support_telegram_url)
        await self.feed_callback(ABOUT_CALLBACK)
        self.assertTrue(any(isinstance(call, SendMessage) for call in self.session.calls))

    async def test_admin_access_remains_restricted(self):
        with patch("handlers.admin.get_settings", return_value=self.settings):
            await self.feed_message("/admin")
            self.assertTrue(any(isinstance(call, SendMessage) for call in self.session.calls))
            self.session.calls.clear()
            self.user = self.user.model_copy(update={"id": 999})
            await self.feed_message("/admin")
            self.assertEqual(self.session.calls, [])

    async def test_login_start_shows_confirmation_without_welcome(self):
        await self.feed_message("/start login_" + "a" * 32)
        messages = [call for call in self.session.calls if isinstance(call, SendMessage)]
        self.assertEqual(len(messages), 1)
        self.assertIn("Подтвердить вход в LCP?", messages[0].text)
        buttons = messages[0].reply_markup.inline_keyboard[0]
        self.assertEqual([button.text for button in buttons], ["✅ Да, войти", "❌ Нет"])
        self.assertTrue(all(len(button.callback_data.encode()) <= 64 for button in buttons))
        self.assertFalse(any(isinstance(call, SendPhoto) for call in self.session.calls))

    async def test_invalid_payload_does_not_show_welcome(self):
        await self.feed_message("/start login_invalid")
        self.assertTrue(any(isinstance(call, SendMessage) and "Некорректная" in call.text for call in self.session.calls))
        self.assertFalse(any(isinstance(call, SendPhoto) for call in self.session.calls))

    async def test_both_buttons_use_callback_identity(self):
        for action, approve in (("yes", True), ("no", False)):
            with patch("handlers.auth.submit_decision", new_callable=AsyncMock) as submit:
                await self.feed_callback(f"auth:{action}:" + "a" * 32)
                submit.assert_awaited_once()
                self.assertEqual(submit.await_args.args[1], "a" * 32)
                self.assertEqual(submit.await_args.args[2].model_dump(), self.user.model_dump())
                self.assertEqual(submit.await_args.args[3], approve)
                self.assertTrue(any(isinstance(call, AnswerCallbackQuery) for call in self.session.calls))
                edits = [call for call in self.session.calls if isinstance(call, EditMessageText)]
                self.assertIsNone(edits[-1].reply_markup)

    async def test_network_error_keeps_buttons_for_retry(self):
        with patch("handlers.auth.submit_decision", new_callable=AsyncMock, side_effect=AuthBackendError("unavailable")):
            await self.feed_callback("auth:yes:" + "a" * 32)
        self.assertFalse(any(isinstance(call, EditMessageText) for call in self.session.calls))
        self.assertTrue(any(isinstance(call, SendMessage) and "недоступен" in call.text for call in self.session.calls))

    async def test_other_chat_cannot_confirm(self):
        with patch("handlers.auth.submit_decision", new_callable=AsyncMock) as submit:
            await self.feed_callback("auth:yes:" + "a" * 32, self.message(chat_id=999))
            submit.assert_not_awaited()

    def test_keyboard_hash_routes(self):
        self.assertEqual(get_main_keyboard().inline_keyboard[0][0].web_app.url,
                         "https://twointhepinky.github.io/LCP4MEMBERS/#/login")
        self.assertEqual(get_menu_button().web_app.url, "https://twointhepinky.github.io/LCP4MEMBERS/#/account")


class AuthClientTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.settings = SimpleNamespace(backend_internal_url="http://127.0.0.1:8000",
                                        bot_internal_secret=secrets.token_urlsafe(32))
        self.enterContext(patch("auth_client.get_settings", return_value=self.settings))
        self.user = User(id=123, is_bot=False, first_name="No username")

    def session(self, status, body=None):
        context = MagicMock()
        context.__aenter__ = AsyncMock(return_value=SimpleNamespace(status=status, json=AsyncMock(return_value=body)))
        context.__aexit__ = AsyncMock(return_value=False)
        session = MagicMock()
        session.post.return_value = context
        return session

    async def test_request_contract_and_optional_fields(self):
        for approve, action in ((True, "confirm"), (False, "cancel")):
            session = self.session(200)
            await submit_decision(session, "a" * 32, self.user, approve)
            args, kwargs = session.post.call_args
            self.assertEqual(args[0], f"http://127.0.0.1:8000/auth/bot/{action}")
            self.assertEqual(kwargs["headers"], {"X-Bot-Internal-Secret": self.settings.bot_internal_secret})
            self.assertEqual(kwargs["json"], {"login_id": "a" * 32, "id": 123,
                "first_name": "No username", "username": None, "last_name": None})
            self.assertFalse(kwargs["allow_redirects"])

    async def test_errors_and_timeouts_are_sanitized(self):
        for status, code in ((404, "unknown_challenge"), (410, "expired"), (409, "consumed"), (401, "unavailable")):
            with self.assertRaises(AuthBackendError) as error:
                await submit_decision(self.session(status, {"detail": code}), "a" * 32, self.user, True)
            self.assertEqual(error.exception.code, code)
        session = MagicMock()
        session.post.side_effect = asyncio.TimeoutError("unsafe details")
        with self.assertRaises(AuthBackendError) as error:
            await submit_decision(session, "a" * 32, self.user, True)
        self.assertEqual(str(error.exception), "unavailable")


class SettingsTests(unittest.TestCase):
    def test_admins_and_base_url_preserved_and_secrets_validated(self):
        values = {"BOT_TOKEN": secrets.token_urlsafe(32), "BOT_INTERNAL_SECRET": secrets.token_urlsafe(32),
            "WEB_APP_URL": "https://twointhepinky.github.io/LCP4MEMBERS",
            "SUPPORT_TELEGRAM_URL": "https://t.me/support_test", "ADMIN_IDS": "123,456"}
        with patch("config.settings.dotenv_values", return_value=values):
            get_settings.cache_clear()
            settings = get_settings()
            self.assertEqual(settings.admin_ids, frozenset({123, 456}))
            self.assertEqual(settings.backend_internal_url, "http://127.0.0.1:8000")
            values["BOT_INTERNAL_SECRET"] = values["BOT_TOKEN"]
            get_settings.cache_clear()
            with self.assertRaises(ConfigurationError):
                get_settings()
        get_settings.cache_clear()


if __name__ == "__main__":
    unittest.main()
