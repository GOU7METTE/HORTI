from collections.abc import Callable
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.core.config import Settings


def test_injected_settings_isolate_applications(
    app_factory: Callable[[Settings], FastAPI], monkeypatch: pytest.MonkeyPatch
) -> None:
    # An invalid ambient value makes accidental factory settings loading fail.
    monkeypatch.setenv("HORTI_ENVIRONMENT", "invalid")
    first = Settings(_env_file=None, environment="test", cors_origins=["https://first.example"])
    second = Settings(_env_file=None, environment="test", cors_origins=[])
    with (
        TestClient(app_factory(first)) as first_client,
        TestClient(app_factory(second)) as second_client,
    ):
        headers = {"Origin": "https://first.example"}
        assert (
            first_client.get("/health", headers=headers).headers["access-control-allow-origin"]
            == "https://first.example"
        )
        assert (
            "access-control-allow-origin"
            not in second_client.get("/health", headers=headers).headers
        )


def test_settings_environment_precedence_and_validation(
    app_factory: Callable[[Settings], FastAPI], tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    dotenv = tmp_path / "synthetic.env"
    dotenv.write_text(
        'HORTI_ENVIRONMENT=development\nHORTI_CORS_ORIGINS=["https://file.example"]\n'
    )
    monkeypatch.setenv("HORTI_ENVIRONMENT", "production")
    settings = Settings(_env_file=dotenv)
    assert settings.environment == "production"
    assert settings.cors_origins == ["https://file.example"]
    assert Settings(_env_file=None).cors_origins == []
    monkeypatch.setenv("HORTI_ENVIRONMENT", "invalid")
    with pytest.raises(ValidationError):
        Settings(_env_file=None)
