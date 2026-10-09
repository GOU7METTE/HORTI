from fastapi import APIRouter

from app.schemas.health import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse, tags=["operations"])
def health() -> HealthResponse:
    """Process liveness only; does not assert model or database readiness."""
    return HealthResponse()
