from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class UnavailableError(BaseModel):
    code: Literal["inference_unavailable"] = "inference_unavailable"
    message: str = "Model inference is unavailable."
    request_id: UUID
    details: list[str] = Field(default_factory=list)


class UnavailableResponse(BaseModel):
    error: UnavailableError
