"""All API tests use a disposable database, never the running demonstration."""
import os
import tempfile
from pathlib import Path
import pytest

_temporary = tempfile.TemporaryDirectory(prefix="hospitaltwin-tests-")
os.environ["DATABASE_URL"] = f"sqlite:///{Path(_temporary.name) / 'test.db'}"
os.environ["BCRYPT_ROUNDS"] = "4"
os.environ["DEMO_MODE"] = "true"

from fastapi.testclient import TestClient
from app.main import app
from app.db.session import Base, engine
from app.db.seed import seed_database


@pytest.fixture
def client():
    Base.metadata.drop_all(bind=engine)
    seed_database()
    with TestClient(app) as instance:
        yield instance


def login(client, role="operator"):
    result = client.post("/api/v1/auth/login", json={"username": role, "password": "demo123"})
    assert result.status_code == 200, result.text
    return {"Authorization": f"Bearer {result.json()['access_token']}"}
