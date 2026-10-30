"""Safe HTTP error translation and server-owned request correlation."""

import logging
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from starlette.datastructures import MutableHeaders
from starlette.exceptions import HTTPException
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.schemas.errors import ApiError, ErrorResponse
from app.services.image_upload import UploadRejected
from app.services.predictions import InferenceUnavailable

logger = logging.getLogger("horti.errors")

HTTP_ERRORS = {
    400: ("bad_request", "Invalid request."),
    404: ("not_found", "Resource not found."),
    405: ("method_not_allowed", "Method not allowed."),
    413: ("payload_too_large", "Request exceeds the allowed size."),
    415: ("unsupported_media_type", "Unsupported content type."),
    422: ("validation_error", "Request validation failed."),
    429: ("rate_limited", "Too many requests."),
    500: ("internal_error", "An unexpected error occurred."),
    503: ("inference_unavailable", "Model inference is unavailable."),
}


def error_response(
    request: Request,
    status: int,
    code: str,
    message: str,
    headers: dict[str, str] | None = None,
) -> JSONResponse:
    body = ErrorResponse(
        error=ApiError(
            code=code,
            message=message,
            request_id=request.state.request_id,
        )
    )
    return JSONResponse(body.model_dump(mode="json"), status_code=status, headers=headers)


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(UploadRejected)
    async def upload_error(request: Request, exc: UploadRejected) -> JSONResponse:
        code = {
            400: "invalid_image",
            413: "payload_too_large",
            415: "unsupported_media_type",
            422: "validation_error",
        }[exc.status_code]
        return error_response(request, exc.status_code, code, exc.message)

    @app.exception_handler(InferenceUnavailable)
    async def inference_error(request: Request, exc: InferenceUnavailable) -> JSONResponse:
        return error_response(request, 503, *HTTP_ERRORS[503])

    @app.exception_handler(RequestValidationError)
    async def validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
        # Do not echo inputs, validator messages, locations, or context into responses/logs.
        return error_response(request, 422, *HTTP_ERRORS[422])

    @app.exception_handler(HTTPException)
    async def http_error(request: Request, exc: HTTPException) -> JSONResponse:
        code, message = HTTP_ERRORS.get(exc.status_code, ("http_error", "Request failed."))
        return error_response(request, exc.status_code, code, message, exc.headers)


class UnexpectedErrorMiddleware:
    """Catch failures inside CORS so even a generated 500 has CORS headers."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        started = False

        async def track_send(message: Message) -> None:
            nonlocal started
            if message["type"] == "http.response.start":
                started = True
            await send(message)

        try:
            await self.app(scope, receive, track_send)
        except Exception:
            if started:
                # Streaming responses cannot be replaced after their headers are sent.
                logger.error("response_failed request_id=%s", scope["state"]["request_id"])
                raise
            response = error_response(
                Request(scope), 500, "internal_error", "An unexpected error occurred."
            )
            await response(scope, receive, send)


class RequestIdMiddleware:
    """Generate IDs rather than trusting user-controlled correlation headers."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        request_id = uuid4()
        scope.setdefault("state", {})["request_id"] = request_id

        async def send_with_id(message: Message) -> None:
            if message["type"] == "http.response.start":
                MutableHeaders(scope=message)["X-Request-ID"] = str(request_id)
                if message["status"] >= 400:
                    logger.warning(
                        "request_failed request_id=%s status=%s", request_id, message["status"]
                    )
            await send(message)

        await self.app(scope, receive, send_with_id)
