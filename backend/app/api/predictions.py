from typing import Annotated

from fastapi import APIRouter, Depends, Request
from starlette.concurrency import run_in_threadpool

from app.schemas.errors import ErrorResponse
from app.schemas.predictions import UnavailableResponse
from app.services.image_upload import consume_image, validate_image
from app.services.predictions import (
    PredictionService,
    get_prediction_service,
)

router = APIRouter(prefix="/api/v1", tags=["predictions"])


async def validated_image(request: Request) -> bytes:
    return await run_in_threadpool(validate_image, await consume_image(request))


@router.post(
    "/predictions",
    status_code=503,
    response_model=UnavailableResponse,
    responses={
        400: {
            "model": ErrorResponse,
            "description": "Malformed multipart, corrupt or animated image, or extra parts.",
        },
        413: {
            "model": ErrorResponse,
            "description": "File, request, multipart overhead/header, or pixel limit exceeded.",
        },
        415: {"model": ErrorResponse, "description": "Decoded image is not JPEG or PNG."},
        422: {"model": ErrorResponse, "description": "Missing multipart image file."},
        500: {"model": ErrorResponse, "description": "Unexpected server failure."},
        503: {"description": "Valid image; model inference is unavailable."},
    },
    openapi_extra={
        "requestBody": {
            "required": True,
            "content": {
                "multipart/form-data": {
                    "schema": {
                        "type": "object",
                        "required": ["image"],
                        "additionalProperties": False,
                        "properties": {"image": {"type": "string", "format": "binary"}},
                    }
                }
            },
        }
    },
    description=(
        "Exactly one JPEG/PNG image, at most 5 MiB and 20 megapixels. "
        "Multipart overhead is limited to 64 KiB. Valid images return 503: no model is available."
    ),
)
def predict(
    image: Annotated[bytes, Depends(validated_image)],
    service: Annotated[PredictionService, Depends(get_prediction_service)],
) -> UnavailableResponse:
    service.predict(image)
