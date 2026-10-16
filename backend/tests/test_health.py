from collections.abc import Callable

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.config import Settings


def test_health(app_factory: Callable[[Settings], FastAPI]) -> None:
    with TestClient(app_factory(Settings(_env_file=None, environment="test"))) as client:
        response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_cors_allows_only_configured_origin(app_factory: Callable[[Settings], FastAPI]) -> None:
    settings = Settings(_env_file=None, environment="test", cors_origins=["http://localhost:3000"])
    with TestClient(app_factory(settings)) as client:
        allowed = client.get("/health", headers={"Origin": "http://localhost:3000"})
        denied = client.get("/health", headers={"Origin": "https://untrusted.example"})
    assert allowed.headers["access-control-allow-origin"] == "http://localhost:3000"
    assert "access-control-allow-origin" not in denied.headers


def test_openapi_exposes_health(app_factory: Callable[[Settings], FastAPI]) -> None:
    with TestClient(app_factory(Settings(_env_file=None, environment="test"))) as client:
        response = client.get("/openapi.json")
    assert response.status_code == 200
    schema = response.json()
    assert "/health" in schema["paths"]
    health_schema = schema["paths"]["/health"]["get"]["responses"]["200"]
    assert health_schema["content"]["application/json"]["schema"] == {
        "$ref": "#/components/schemas/HealthResponse"
    }
    assert (
        schema["components"]["schemas"]["HealthResponse"]["properties"]["status"]["const"] == "ok"
    )
