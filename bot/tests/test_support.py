"""Support delivery checks without Telegram or backend network calls."""
import asyncio
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, call, patch

from aiohttp import ClientConnectionError
from aiogram.exceptions import TelegramForbiddenError, TelegramNetworkError, TelegramRetryAfter
from aiogram.methods import SendMessage

from handlers.support import notify_ticket
from main import support_notifier
from support_client import SupportBackendError, acknowledge_notification, get_pending_tickets


def ticket(ticket_id=1):
    return {"id": ticket_id, "updated_at": "2026-09-21T00:00:00+00:00", "first_name": "Test",
            "user_id": 123, "category": "other", "messages": [{"author_kind": "user", "message": "private message"}]}


class SupportDeliveryTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.enterContext(patch("handlers.support.get_settings", return_value=SimpleNamespace(admin_ids=(111, 222))))
        self.bot = SimpleNamespace(send_message=AsyncMock())

    async def test_notification_uses_latest_user_message_without_earlier_private_content(self):
        item = ticket(42)
        item["messages"] = [
            {"author_kind": "user", "message": "Original private request"},
            {"author_kind": "admin", "message": "Earlier private admin reply"},
            {"author_kind": "user", "message": "Intermediate private follow-up"},
            {"author_kind": "user", "message": "Newest user message"},
            {"author_kind": "admin", "message": "Latest admin reply"},
        ]
        self.assertTrue(await notify_ticket(self.bot, item))
        self.assertEqual(self.bot.send_message.await_count, 2)
        for delivery in self.bot.send_message.await_args_list:
            text = delivery.args[1]
            self.assertTrue(text.startswith("💬 Новое сообщение в обращении #42\n\n"))
            self.assertTrue(text.endswith("\n\nNewest user message"))
            for message in item["messages"]:
                if message["message"] != "Newest user message":
                    self.assertNotIn(message["message"], text)

    async def test_new_ticket_keeps_original_title_and_first_user_message(self):
        self.assertTrue(await notify_ticket(self.bot, ticket(7)))
        self.assertEqual(self.bot.send_message.await_count, 2)
        for delivery in self.bot.send_message.await_args_list:
            self.assertEqual(delivery.args[1],
                "🆕 Новое обращение #7\n\nПользователь: Test\nTelegram: без username\n"
                "ID: 123\nКатегория: Другое\n\nprivate message")
            self.assertIsNone(delivery.kwargs["parse_mode"])
            self.assertIsNotNone(delivery.kwargs["reply_markup"])

    async def test_one_admin_failure_does_not_prevent_another_delivery(self):
        method = SendMessage(chat_id=111, text="private message")
        for error in (TelegramForbiddenError(method, "secret details"), TelegramNetworkError(method, "secret details"),
                      TelegramRetryAfter(method, "secret details", retry_after=10), TimeoutError("secret details")):
            self.bot.send_message.reset_mock()
            self.bot.send_message.side_effect = [error, True]
            with self.assertLogs("handlers.support", level="WARNING") as logs:
                self.assertTrue(await notify_ticket(self.bot, ticket()))
            self.assertEqual(self.bot.send_message.await_count, 2)
            self.assertNotIn("secret details", " ".join(logs.output))
            self.assertNotIn("private message", " ".join(logs.output))

    async def test_all_deliveries_fail_or_no_admins_never_counts_as_success(self):
        self.bot.send_message.side_effect = ClientConnectionError("secret details")
        with self.assertLogs("handlers.support", level="WARNING"):
            self.assertFalse(await notify_ticket(self.bot, ticket()))
        self.assertEqual(self.bot.send_message.await_count, 2)
        with patch("handlers.support.get_settings", return_value=SimpleNamespace(admin_ids=())):
            self.assertFalse(await notify_ticket(self.bot, ticket()))

    async def test_failed_delivery_is_retried_then_acknowledged_after_success(self):
        item = ticket()
        self.bot.send_message.side_effect = [TimeoutError(), TimeoutError(), True, True]
        with patch("main.get_pending_tickets", new_callable=AsyncMock, return_value=[item]) as pending, \
                patch("main.acknowledge_notification", new_callable=AsyncMock) as ack, \
                patch("main.asyncio.sleep", new_callable=AsyncMock, side_effect=[None, asyncio.CancelledError()]) as sleep, \
                self.assertLogs("handlers.support", level="WARNING"):
            async def confirm(*args):
                self.assertEqual(self.bot.send_message.await_count, 4)
            ack.side_effect = confirm
            with self.assertRaises(asyncio.CancelledError):
                await support_notifier(self.bot, "http-session")
            ack.assert_awaited_once_with("http-session", item["id"], item["updated_at"])
            self.assertEqual(pending.await_count, 2)
            self.assertEqual(sleep.await_args_list, [call(5), call(5)])

    async def test_backend_and_ticket_errors_do_not_stop_later_tickets_or_cycles(self):
        items = [ticket(1), ticket(2), ticket(3)]
        with patch("main.get_pending_tickets", new_callable=AsyncMock, side_effect=[SupportBackendError(), items, [items[1]]]) as pending, \
                patch("main.notify_ticket", new_callable=AsyncMock, side_effect=[RuntimeError("private message"), True, True, True]) as notify, \
                patch("main.acknowledge_notification", new_callable=AsyncMock, side_effect=[SupportBackendError(), {}, {}]) as ack, \
                patch("main.asyncio.sleep", new_callable=AsyncMock, side_effect=[None, None, asyncio.CancelledError()]) as sleep, \
                self.assertLogs("main", level="WARNING") as logs:
            with self.assertRaises(asyncio.CancelledError):
                await support_notifier(self.bot, "http-session")
            self.assertEqual(pending.await_count, 3)
            self.assertEqual(notify.await_count, 4)
            self.assertEqual([args.args[1] for args in ack.await_args_list], [2, 3, 2])
            self.assertEqual(sleep.await_args_list, [call(5)] * 3)
            self.assertNotIn("private message", " ".join(logs.output))

    async def test_cancellation_is_not_swallowed(self):
        with patch("main.get_pending_tickets", new_callable=AsyncMock, side_effect=asyncio.CancelledError()), \
                patch("main.asyncio.sleep", new_callable=AsyncMock) as sleep:
            with self.assertRaises(asyncio.CancelledError):
                await support_notifier(self.bot, "http-session")
            sleep.assert_not_awaited()


class SupportClientTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.settings = SimpleNamespace(backend_internal_url="http://backend.test", bot_internal_secret="fixture-secret")
        self.enterContext(patch("support_client.get_settings", return_value=self.settings))

    def session(self, status=200, data=None):
        response = SimpleNamespace(status=status, json=AsyncMock(return_value=data))
        context = MagicMock()
        context.__aenter__ = AsyncMock(return_value=response)
        context.__aexit__ = AsyncMock(return_value=False)
        session = MagicMock()
        session.request.return_value = context
        return session

    async def test_acknowledgement_contract_and_pending_are_separate(self):
        session = self.session(data={"tickets": [ticket()]})
        self.assertEqual(await get_pending_tickets(session), [ticket()])
        self.assertEqual(session.request.call_args.args, ("GET", "http://backend.test/support/internal/pending"))
        session = self.session(data={"ok": True})
        await acknowledge_notification(session, 1, ticket()["updated_at"])
        session.request.assert_called_once_with(
            "POST", "http://backend.test/support/internal/tickets/1/notified",
            headers={"X-Bot-Internal-Secret": "fixture-secret"}, allow_redirects=False,
            json={"updated_at": ticket()["updated_at"]},
        )

    async def test_http_json_and_network_failures_are_sanitized(self):
        for status, body in [(401, {}), (500, {}), (200, [])]:
            with self.assertRaises(SupportBackendError):
                await get_pending_tickets(self.session(status, body))
        for failure in [ClientConnectionError("fixture-secret"), TimeoutError("fixture-secret"), ValueError("fixture-secret")]:
            session = MagicMock()
            session.request.side_effect = failure
            with self.assertRaises(SupportBackendError) as caught:
                await get_pending_tickets(session)
            self.assertNotIn("fixture-secret", str(caught.exception))
            self.assertTrue(caught.exception.__suppress_context__)


if __name__ == "__main__":
    unittest.main()
