from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, Depends, File, UploadFile

from app.schemas.predictions import UnavailableError, UnavailableResponse
from app.services.predictions import (
    InferenceUnavailable,
    PredictionService,
    get_prediction_service,
)

router = APIRouter(prefix="/api/v1", tags=["predictions"])


@router.post(
    "/predictions",
    status_code=503,
    response_model=UnavailableResponse,
    responses={503: {"description": "Model inference is unavailable."}},
    description=(
        "Contract only: requires an image file but does not validate image content or size. "
        "No model is available; formed requests always return 503."
    ),
)
def predict(
    image: Annotated[
        UploadFile, File(description="One leaf image; validation is not yet implemented.")
    ],
    service: Annotated[PredictionService, Depends(get_prediction_service)],
) -> UnavailableResponse:
    try:
        service.predict(image)
    except InferenceUnavailable:
        return UnavailableResponse(error=UnavailableError(request_id=uuid4()))
