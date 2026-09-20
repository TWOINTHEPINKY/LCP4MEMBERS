import os
import gc
import secrets
import tempfile
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from jose import jwt

from backend.app.main import app
from backend.app.support import SupportStore


class SupportApiTests(unittest.TestCase):
    def setUp(self):
        self.env = {name: secrets.token_urlsafe(32) for name in ("BOT_TOKEN", "JWT_SECRET", "BOT_INTERNAL_SECRET")}
        self.enterContext(patch.dict(os.environ, self.env, clear=True))
        self.enterContext(patch("backend.app.main.load_dotenv"))
        self.temp_dir = self.enterContext(tempfile.TemporaryDirectory())
        self.client = self.enterContext(TestClient(app))
        self.store = SupportStore(os.path.join(self.temp_dir, "support.sqlite3"))
        app.state.support_store = self.store
        self.internal = {"X-Bot-Internal-Secret": self.env["BOT_INTERNAL_SECRET"]}
        self.user = {"id": 123456, "first_name": "Test", "username": "tester", "last_name": None}
        self.other_user = {"id": 654321, "first_name": "Other", "username": "other", "last_name": None}

    def tearDown(self):
        app.state.support_store = None
        gc.collect()

    def token(self, user):
        return jwt.encode({"sub": str(user["id"]), "username": user["username"], "first_name": user["first_name"], "last_name": user["last_name"], "exp": 4102444800}, self.env["JWT_SECRET"], algorithm="HS256")

    def auth(self, user=None):
        return {"Authorization": f"Bearer {self.token(user or self.user)}"}

    def test_ticket_lifecycle_and_user_isolation(self):
        response = self.client.post("/support/tickets", headers=self.auth(), json={"category": "connection", "message": "Cannot connect"})
        self.assertEqual(response.status_code, 200)
        ticket = response.json()
        self.assertEqual(ticket["status"], "open")
        ticket_id = ticket["id"]
        self.assertEqual(len(ticket["messages"]), 1)

        self.assertEqual(self.client.get("/support/tickets", headers=self.auth(self.other_user)).json(), {"tickets": []})
        self.assertEqual(self.client.get(f"/support/tickets/{ticket_id}", headers=self.auth(self.other_user)).status_code, 404)

        pending = self.client.get("/support/internal/pending", headers=self.internal)
        self.assertEqual(pending.status_code, 200)
        self.assertEqual(pending.json()["tickets"][0]["id"], ticket_id)
        self.assertEqual(self.client.get("/support/internal/pending", headers=self.internal).json(), {"tickets": []})

        reply = self.client.post(f"/support/internal/tickets/{ticket_id}/messages", headers=self.internal, json={"admin_id": 999, "message": "Try another server"})
        self.assertEqual(reply.status_code, 200)
        self.assertEqual(reply.json()["status"], "waiting_user")
        self.assertEqual(reply.json()["messages"][-1]["author_kind"], "admin")

        user_reply = self.client.post(f"/support/tickets/{ticket_id}/messages", headers=self.auth(), json={"message": "That worked"})
        self.assertEqual(user_reply.status_code, 200)
        self.assertEqual(user_reply.json()["status"], "open")
        self.assertEqual(len(user_reply.json()["messages"]), 3)
        self.assertEqual(self.client.post(f"/support/internal/tickets/{ticket_id}/close", headers=self.internal).json()["status"], "closed")

    def test_internal_endpoints_require_secret(self):
        response = self.client.get("/support/internal/pending")
        self.assertEqual(response.status_code, 401)
        response = self.client.post("/support/tickets", headers=self.auth(), json={"category": "other", "message": "Hello"})
        self.assertEqual(response.status_code, 200)
        ticket_id = response.json()["id"]
        self.assertEqual(self.client.post(f"/support/internal/tickets/{ticket_id}/close", headers={}).status_code, 401)


if __name__ == "__main__":
    unittest.main()
