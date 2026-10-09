from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    """Validated settings loaded from root .env and the process environment."""

    model_config = SettingsConfigDict(env_prefix="HORTI_", env_file=ROOT / ".env", extra="ignore")
    environment: Literal["development", "test", "production"] = "development"
    cors_origins: list[str] = []
