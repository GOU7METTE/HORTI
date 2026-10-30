from uuid import UUID

from pydantic import BaseModel, Field


class ApiError(BaseModel):
    code: str
    message: str
    request_id: UUID
    details: list[str] = Field(default_factory=list)


class ErrorResponse(BaseModel):
    error: ApiError
