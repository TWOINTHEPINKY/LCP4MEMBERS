"""Run from the repo root: backend/.venv/bin/python -m unittest discover -s backend/tests -v"""

import asyncio
import hashlib
import hmac
import json
import os
import secrets
import time
import unittest
from unittest.mock import patch
from urllib.parse import parse_qsl, urlencode

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

    def webapp_data(self, changes=None, omit=()):
        data = {"auth_date": str(int(time.time())), "query_id": "test-query+with/slash=",
                "user": json.dumps(self.user, ensure_ascii=False),
                "signature": "additional-signed-field", "start_param": ""}
        data.update(changes or {})
        for key in omit:
            data.pop(key, None)
        check = "\n".join(f"{key}={data[key]}" for key in sorted(data))
        secret = hmac.new(b"WebAppData", self.env["BOT_TOKEN"].encode(), hashlib.sha256).digest()
        data["hash"] = hmac.new(secret, check.encode(), hashlib.sha256).hexdigest()
        # Deliberately transmit fields in a different order from the signed string.
        return urlencode(list(reversed(list(data.items()))))

    def assert_webapp_rejected(self, init_data):
        response = self.client.post("/auth/telegram-webapp", json={"init_data": init_data})
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json(), {"detail": "invalid_telegram_webapp_data"})
        self.assertEqual(response.headers["cache-control"], "no-store")
        self.assertEqual(response.headers["pragma"], "no-cache")

    def test_webapp_login_and_me(self):
        response = self.client.post("/auth/telegram-webapp", json={"init_data": self.webapp_data()})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers["cache-control"], "no-store")
        self.assertEqual(response.headers["pragma"], "no-cache")
        data = response.json()
        self.assertTrue(data["access_token"])
        self.assertEqual(data["token_type"], "bearer")
        self.assertEqual(data["user"], self.user)
        claims = jwt.decode(data["access_token"], self.env["JWT_SECRET"], algorithms=["HS256"])
        self.assertEqual(claims["sub"], str(self.user["id"]))
        self.assertAlmostEqual(claims["exp"] - time.time(), 30 * 86400, delta=5)
        profile = self.client.get("/auth/me", headers={"Authorization": f'Bearer {data["access_token"]}'})
        self.assertEqual(profile.status_code, 200)
        self.assertEqual(profile.json(), self.user)

    def test_webapp_rejects_tampered_user_and_signed_extra_fields(self):
        for key, value in (("user", json.dumps({**self.user, "id": 999999})),
                           ("signature", "tampered"), ("start_param", "tampered")):
            with self.subTest(field=key):
                data = dict(parse_qsl(self.webapp_data(), keep_blank_values=True))
                data[key] = value
                self.assert_webapp_rejected(urlencode(data))

    def test_webapp_rejects_bad_or_missing_hash(self):
        for value in (None, "", "0" * 64, "not-a-hash", "я" * 64):
            with self.subTest(hash_kind="missing" if value is None else "invalid"):
                data = dict(parse_qsl(self.webapp_data(), keep_blank_values=True))
                data.pop("hash")
                if value is not None:
                    data["hash"] = value
                self.assert_webapp_rejected(urlencode(data))

    def test_webapp_rejects_missing_user_or_auth_date(self):
        for key in ("user", "auth_date"):
            with self.subTest(field=key):
                self.assert_webapp_rejected(self.webapp_data(omit=(key,)))

    def test_webapp_rejects_malformed_user(self):
        for user in ("{broken", "null", "[]", "{}", json.dumps({"id": True, "first_name": "Test"}),
                     json.dumps({"id": "123", "first_name": "Test"}),
                     json.dumps({"id": -1, "first_name": "Test"}),
                     json.dumps({"id": 123, "first_name": ""})):
            with self.subTest(user_kind=user[:12]):
                self.assert_webapp_rejected(self.webapp_data({"user": user}))

    def test_webapp_rejects_stale_future_or_invalid_auth_date(self):
        for timestamp in (str(int(time.time()) - 86401), str(int(time.time()) + 3600),
                          "", "NaN", "1.5", "9" * 400):
            with self.subTest(timestamp_kind=timestamp[:12]):
                self.assert_webapp_rejected(self.webapp_data({"auth_date": timestamp}))

    def test_webapp_rejects_ambiguous_or_malformed_query(self):
        signed = self.webapp_data()
        for suffix in ("&hash=" + "0" * 64, "&user=%7B%7D", "&auth_date=1", "&broken",
                       "&extra=%ZZ", "&extra=%FF", "&extra=%0Ainjected", "&=empty-key"):
            with self.subTest(suffix_kind=suffix[:12]):
                self.assert_webapp_rejected(signed + suffix)

    def test_webapp_rejects_duplicate_fields_even_when_signature_would_still_match(self):
        signed = self.webapp_data()
        data = dict(parse_qsl(signed, keep_blank_values=True))
        for key in ("hash", "user", "auth_date"):
            with self.subTest(field=key):
                self.assert_webapp_rejected(signed + "&" + urlencode({key: data[key]}))

    def test_webapp_auth_date_boundaries(self):
        now = int(time.time())
        with patch("backend.app.auth.time.time", return_value=now):
            for offset, status in ((-86400, 200), (-86401, 401), (30, 200), (31, 401)):
                with self.subTest(offset=offset):
                    response = self.client.post("/auth/telegram-webapp", json={
                        "init_data": self.webapp_data({"auth_date": str(now + offset)})})
                    self.assertEqual(response.status_code, status)

    def test_webapp_rejects_widget_signature_algorithm(self):
        data = dict(parse_qsl(self.webapp_data(), keep_blank_values=True))
        data.pop("hash")
        check = "\n".join(f"{key}={data[key]}" for key in sorted(data))
        secret = hashlib.sha256(self.env["BOT_TOKEN"].encode()).digest()
        data["hash"] = hmac.new(secret, check.encode(), hashlib.sha256).hexdigest()
        self.assert_webapp_rejected(urlencode(data))

    def test_webapp_rejects_malformed_body_without_echoing_input(self):
        for body in ({}, {"init_data": None}, {"init_data": 123}, {"init_data": ""},
                     {"init_data": "x" * 16385}, [], "not-an-object"):
            response = self.client.post("/auth/telegram-webapp", json=body)
            self.assertEqual(response.status_code, 401)
            self.assertEqual(response.json(), {"detail": "invalid_telegram_webapp_data"})
        response = self.client.post("/auth/telegram-webapp", content="{broken",
                                    headers={"Content-Type": "application/json"})
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json(), {"detail": "invalid_telegram_webapp_data"})

    def test_cors_health_and_plans(self):
        for origin in ("http://localhost:5173", "https://twointhepinky.github.io"):
            for path, method, header in (("/auth/bot/start", "POST", "content-type"),
                                         ("/auth/telegram-webapp", "POST", "content-type"),
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
