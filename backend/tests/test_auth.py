"""Run from the repo root: backend/.venv/bin/python -m unittest discover -s backend/tests -v"""

import asyncio
import hashlib
import hmac
import os
import secrets
import time
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from jose import jwt

from backend.app.challenges import ChallengeError, InMemoryChallengeStore
from backend.app.main import app
from backend.app.settings import get_settings


class AuthTests(unittest.TestCase):
    def setUp(self):
        self.env = {name: secrets.token_urlsafe(32) for name in ("BOT_TOKEN", "JWT_SECRET", "BOT_INTERNAL_SECRET")}
        self.enterContext(patch.dict(os.environ, self.env, clear=True))
        self.enterContext(patch("backend.app.main.load_dotenv"))  # Never read real .env in tests.
        self.client = self.enterContext(TestClient(app))
        self.now = 1000.0
        app.state.challenge_store = InMemoryChallengeStore(clock=lambda: self.now)
        self.user = {"id": 123456, "first_name": "Тест <User>", "username": "test_user", "last_name": None}
        self.internal = {"X-Bot-Internal-Secret": self.env["BOT_INTERNAL_SECRET"]}

    def start(self):
        response = self.client.post("/auth/bot/start")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers["cache-control"], "no-store")
        data = response.json()
        self.assertRegex(data["login_id"], r"^[A-Za-z0-9_-]{32}$")
        self.assertEqual(data["telegram_url"], f'https://t.me/connorsvpn_bot?start=login_{data["login_id"]}')
        self.assertNotIn(data["browser_token"], data["telegram_url"])
        self.assertEqual(data["expires_in"], 300)
        return data

    def status(self, challenge, token=None):
        return self.client.get(f'/auth/bot/status/{challenge["login_id"]}',
                               headers={"X-Login-Token": token or challenge["browser_token"]})

    def decide(self, challenge, action="confirm", user=None, headers=None):
        return self.client.post(f"/auth/bot/{action}",
                                json={"login_id": challenge["login_id"], **(user or self.user)},
                                headers=self.internal if headers is None else headers)

    def test_full_login_and_one_time_redemption(self):
        challenge = self.start()
        self.assertEqual(self.status(challenge).json(), {"status": "pending"})
        confirmation = self.decide(challenge)
        self.assertEqual(confirmation.json(), {"status": "approved"})
        result = self.status(challenge)
        self.assertEqual(result.status_code, 200)
        token = result.json()["access_token"]
        self.assertEqual(result.json()["status"], "approved")
        claims = jwt.decode(token, self.env["JWT_SECRET"], algorithms=["HS256"])
        self.assertEqual(claims["sub"], str(self.user["id"]))
        self.assertAlmostEqual(claims["exp"] - time.time(), 30 * 86400, delta=5)
        me = self.client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(me.json(), self.user)
        self.assertEqual(me.headers["cache-control"], "no-store")
        for response in (self.status(challenge), self.decide(challenge), self.decide(challenge, "cancel")):
            self.assertEqual(response.status_code, 409)
            self.assertEqual(response.json()["detail"], "consumed")

    def test_only_originating_browser_can_redeem(self):
        challenge = self.start()
        self.decide(challenge)
        for response in (self.status(challenge, "wrong"), self.client.get(f'/auth/bot/status/{challenge["login_id"]}')):
            self.assertEqual(response.status_code, 403)
            self.assertNotIn("access_token", response.json())
        self.assertIn("access_token", self.status(challenge).json())

    def test_reconfirmation_cannot_change_user_or_cancel_approval(self):
        challenge = self.start()
        self.decide(challenge)
        other = {**self.user, "id": 999999}
        self.assertEqual(self.decide(challenge, user=other).status_code, 409)
        self.assertEqual(self.decide(challenge, "cancel", user=other).status_code, 409)
        self.assertEqual(self.status(challenge).json()["user"]["id"], self.user["id"])

    def test_cancel_is_terminal(self):
        challenge = self.start()
        self.assertEqual(self.decide(challenge, "cancel").json(), {"status": "cancelled"})
        self.assertEqual(self.status(challenge).json(), {"status": "cancelled"})
        self.assertEqual(self.decide(challenge).status_code, 409)
        self.assertEqual(self.decide(challenge, "cancel").status_code, 409)

    def test_expired_pending_and_approved_never_issue_tokens(self):
        for approve in (False, True):
            challenge = self.start()
            if approve:
                self.decide(challenge)
            self.now += 300
            self.assertEqual(self.status(challenge).json(), {"status": "expired"})
            for action in ("confirm", "cancel"):
                self.assertEqual(self.decide(challenge, action).status_code, 410)

    def test_unknown_and_malformed_ids(self):
        challenge = {"login_id": "a" * 32, "browser_token": "missing"}
        self.assertEqual(self.status(challenge).status_code, 404)
        self.assertEqual(self.decide(challenge).status_code, 404)
        challenge["login_id"] = "invalid"
        self.assertEqual(self.status(challenge).status_code, 422)

    def test_internal_secret_required_for_both_decisions(self):
        challenge = self.start()
        for action in ("confirm", "cancel"):
            for headers in ({}, {"X-Bot-Internal-Secret": "wrong"}, {"X-Bot-Internal-Secret": self.env["BOT_TOKEN"]}):
                self.assertEqual(self.decide(challenge, action, headers=headers).status_code, 401)
        self.assertEqual(self.status(challenge).json()["status"], "pending")

    def test_me_rejects_invalid_expired_and_incomplete_jwt(self):
        self.assertEqual(self.client.get("/auth/me").status_code, 401)
        claims = {"sub": "123", "first_name": "Test", "exp": int(time.time()) + 60}
        invalid = ["broken", "a.b.c", jwt.encode(claims, "wrong-signing-key", algorithm="HS256")]
        for changed in ({"exp": 0}, {"exp": "bad"}, {"sub": "NaN"}, {"first_name": None}, {"sub": "-1"}):
            invalid.append(jwt.encode({**claims, **changed}, self.env["JWT_SECRET"], algorithm="HS256"))
        invalid.append(jwt.encode({"sub": "123", "first_name": "Test"}, self.env["JWT_SECRET"], algorithm="HS256"))
        for token in invalid:
            with self.subTest(token_kind=token[:8]):
                response = self.client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
                self.assertEqual(response.status_code, 401)

    def test_widget_optional_fields_and_signature(self):
        for extra in ({}, {"username": "tester", "last_name": "Optional", "photo_url": "https://example.com/photo.jpg"}):
            data = {"id": 123, "first_name": "Name", "auth_date": int(time.time()), **extra}
            check = "\n".join(f"{key}={data[key]}" for key in sorted(data))
            data["hash"] = hmac.new(hashlib.sha256(self.env["BOT_TOKEN"].encode()).digest(),
                                    check.encode(), hashlib.sha256).hexdigest()
            response = self.client.post("/auth/telegram", json=data)
            self.assertEqual(response.status_code, 200)
            self.assertIn("access_token", response.json())
            data["first_name"] = "Tampered"
            self.assertEqual(self.client.post("/auth/telegram", json=data).status_code, 401)

    def test_widget_old_and_future_timestamps(self):
        for timestamp in (int(time.time()) - 86401, int(time.time()) + 3600):
            data = {"id": 123, "first_name": "Name", "auth_date": timestamp}
            check = "\n".join(f"{key}={data[key]}" for key in sorted(data))
            data["hash"] = hmac.new(hashlib.sha256(self.env["BOT_TOKEN"].encode()).digest(),
                                    check.encode(), hashlib.sha256).hexdigest()
            self.assertEqual(self.client.post("/auth/telegram", json=data).status_code, 401)

    def test_cors_health_and_plans(self):
        for origin in ("http://localhost:5173", "https://twointhepinky.github.io"):
            for path, method, header in (("/auth/bot/start", "POST", "content-type"),
                                         ("/auth/bot/status/id", "GET", "x-login-token"),
                                         ("/auth/me", "GET", "authorization")):
                response = self.client.options(path, headers={"Origin": origin,
                    "Access-Control-Request-Method": method, "Access-Control-Request-Headers": header})
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.headers["access-control-allow-origin"], origin)
        self.assertEqual(self.client.get("/health").json()["status"], "ok")
        self.assertEqual(len(self.client.get("/plans").json()), 3)

    def test_startup_rejects_missing_or_reused_secrets(self):
        for name in self.env:
            with patch.dict(os.environ, {name: ""}):
                with self.assertRaisesRegex(RuntimeError, name):
                    get_settings()
        with patch.dict(os.environ, {"BOT_INTERNAL_SECRET": self.env["BOT_TOKEN"]}):
            with self.assertRaisesRegex(RuntimeError, "must differ"):
                get_settings()


class StoreRaceTests(unittest.IsolatedAsyncioTestCase):
    async def test_concurrent_decisions_and_consumption_have_one_winner(self):
        store = InMemoryChallengeStore()
        login_id, browser_token = await store.create()
        results = await asyncio.gather(
            *(store.decide(login_id, {"id": i}, True) for i in range(20)), return_exceptions=True)
        self.assertEqual(sum(result is None for result in results), 1)
        results = await asyncio.gather(*(store.consume(login_id, browser_token) for _ in range(20)), return_exceptions=True)
        self.assertEqual(sum(isinstance(result, tuple) for result in results), 1)
        self.assertTrue(all(isinstance(result, ChallengeError) or result[0] == "approved" for result in results))

    async def test_capacity_and_lazy_eviction(self):
        now = 0
        store = InMemoryChallengeStore(ttl=5, max_entries=1, clock=lambda: now)
        await store.create()
        with self.assertRaises(ChallengeError) as context:
            await store.create()
        self.assertEqual(context.exception.status_code, 429)
        now = 11
        await store.create()


if __name__ == "__main__":
    unittest.main()
