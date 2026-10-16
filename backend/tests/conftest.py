import os
from collections.abc import Callable

import pytest
from fastapi import FastAPI

from app.core.config import Settings


@pytest.fixture
def app_factory(monkeypatch: pytest.MonkeyPatch) -> Callable[[Settings], FastAPI]:
    # Isolate even the module-level app created when app.main is first imported.
    for name in os.environ:
        if name.upper().startswith("HORTI_"):
            monkeypatch.delenv(name)
    monkeypatch.setitem(Settings.model_config, "env_file", None)

    from app.main import create_app

    return create_app
