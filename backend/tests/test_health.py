from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app


def test_health() -> None:
    with TestClient(create_app(Settings(_env_file=None, environment="test"))) as client:
        response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_cors_allows_only_configured_origin() -> None:
    settings = Settings(_env_file=None, environment="test", cors_origins=["http://localhost:3000"])
    with TestClient(create_app(settings)) as client:
        allowed = client.get("/health", headers={"Origin": "http://localhost:3000"})
        denied = client.get("/health", headers={"Origin": "https://untrusted.example"})
    assert allowed.headers["access-control-allow-origin"] == "http://localhost:3000"
    assert "access-control-allow-origin" not in denied.headers
