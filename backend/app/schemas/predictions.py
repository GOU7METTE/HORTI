from typing import Literal

from pydantic import BaseModel

from app.schemas.errors import ApiError


class UnavailableError(ApiError):
    code: Literal["inference_unavailable"] = "inference_unavailable"
    message: str = "Model inference is unavailable."


class UnavailableResponse(BaseModel):
    error: UnavailableError
