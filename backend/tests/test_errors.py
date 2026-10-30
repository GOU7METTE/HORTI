import logging
from collections.abc import Callable, Iterator
from concurrent.futures import ThreadPoolExecutor
from io import BytesIO
from unittest.mock import Mock
from uuid import UUID

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from PIL import Image
from pydantic import BaseModel, field_validator

from app.core.config import Settings
from app.services.image_upload import UploadRejected
from app.services.predictions import InferenceUnavailable, PredictionService, get_prediction_service


class Input(BaseModel):
    count: int


@pytest.fixture
def client(app_factory: Callable[[Settings], FastAPI]) -> Iterator[TestClient]:
    app = app_factory(
        Settings(_env_file=None, environment="test", cors_origins=["http://localhost:3000"])
    )

    @app.post("/validation")
    def validation(body: Input):
        return body

    @app.get("/failure")
    def failure():
        raise RuntimeError("private-filename.jpg raw-image EXIF secret /private/model")

    @app.get("/http-error/{status}")
    def http_error(status: int):
        raise HTTPException(status, "private detail", headers={"Retry-After": "10"})

    @app.get("/upload-error/{status}")
    def upload_error(status: int):
        raise UploadRejected(status, "Safe upload rejection.")

    with TestClient(app) as client:
        yield client


def assert_error(response, status, code):
    assert response.status_code == status
    request_id = response.headers["x-request-id"]
    assert UUID(request_id).version == 4
    error = response.json()["error"]
    assert set(error) == {"code", "message", "request_id", "details"}
    assert error["code"] == code
    assert error["request_id"] == request_id
    assert error["details"] == []
    return request_id


@pytest.mark.parametrize(
    "status,code",
    [
        (400, "invalid_image"),
        (413, "payload_too_large"),
        (415, "unsupported_media_type"),
        (422, "validation_error"),
    ],
)
def test_upload_errors(client, status, code):
    assert_error(client.get(f"/upload-error/{status}"), status, code)


def test_actual_invalid_upload(client):
    assert_error(
        client.post(
            "/api/v1/predictions",
            files={
                "image": ("private-filename.jpg", b"raw-image EXIF secret", "image/jpeg"),
            },
        ),
        400,
        "invalid_image",
    )


def test_validation_omits_input_and_context(client, caplog):
    with caplog.at_level(logging.WARNING, logger="horti.errors"):
        response = client.post("/validation", json={"count": "private-input"})
    request_id = assert_error(response, 422, "validation_error")
    assert "private-input" not in response.text + caplog.text
    assert request_id in caplog.text


@pytest.mark.parametrize(
    "path,status,code",
    [
        ("/missing?secret=private-input", 404, "not_found"),
        ("/http-error/429", 429, "rate_limited"),
        ("/http-error/500", 500, "internal_error"),
        ("/http-error/400", 400, "bad_request"),
        ("/http-error/401", 401, "http_error"),
        ("/http-error/413", 413, "payload_too_large"),
        ("/http-error/415", 415, "unsupported_media_type"),
        ("/http-error/422", 422, "validation_error"),
        ("/http-error/503", 503, "inference_unavailable"),
    ],
)
def test_http_errors_are_safe(client, path, status, code, caplog):
    response = client.get(path)
    assert_error(response, status, code)
    assert "private" not in response.text + caplog.text
    if path.startswith("/http-error"):
        assert response.headers["retry-after"] == "10"


def test_method_not_allowed(client):
    response = client.post("/health")
    assert_error(response, 405, "method_not_allowed")
    assert "GET" in response.headers["allow"]


def test_unexpected_failure_is_safe_and_has_cors(client, caplog):
    with caplog.at_level(logging.WARNING, logger="horti.errors"):
        response = client.get(
            "/failure?secret=private-input",
            headers={
                "Origin": "http://localhost:3000",
            },
        )
    request_id = assert_error(response, 500, "internal_error")
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"
    assert "X-Request-ID" in response.headers["access-control-expose-headers"]
    assert request_id in caplog.text
    assert "status=500" in caplog.text
    for secret in ("private", "raw-image", "EXIF", "secret", "RuntimeError", "Traceback"):
        assert secret not in response.text + caplog.text
    assert all(record.exc_info is None for record in caplog.records)


def test_ids_are_generated_unique_and_do_not_change_health_body(client):
    def fetch(_):
        response = client.get("/health", headers={"X-Request-ID": "untrusted-value"})
        assert response.json() == {"status": "ok"}
        request_id = response.headers["x-request-id"]
        assert UUID(request_id).version == 4
        return request_id

    with ThreadPoolExecutor(max_workers=4) as executor:
        ids = list(executor.map(fetch, range(12)))
    assert len(set(ids)) == 12


def test_preflight_has_id(client):
    response = client.options(
        "/api/v1/predictions",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert response.status_code == 200
    assert UUID(response.headers["x-request-id"])


def test_openapi_error_models(client):
    schema = client.get("/openapi.json").json()
    responses = schema["paths"]["/api/v1/predictions"]["post"]["responses"]
    for status in (400, 413, 415, 422, 500):
        assert responses[str(status)]["content"]["application/json"]["schema"] == {
            "$ref": "#/components/schemas/ErrorResponse",
        }


@pytest.mark.parametrize(
    "failure,status,code",
    [
        (InferenceUnavailable("credential=private-domain"), 503, "inference_unavailable"),
        (RuntimeError("credential=private-domain /private/model"), 500, "internal_error"),
    ],
)
def test_prediction_service_failures(client, failure, status, code, caplog):
    service = Mock(spec=PredictionService)
    service.predict.side_effect = failure
    client.app.dependency_overrides[get_prediction_service] = lambda: service
    with BytesIO() as output, Image.new("RGB", (2, 2)) as image:
        image.save(output, format="PNG")
        response = client.post(
            "/api/v1/predictions",
            files={
                "image": ("private-filename.png", output.getvalue(), "image/png"),
            },
            headers={
                "Authorization": "Bearer private-credential",
                "X-Request-ID": str(UUID(int=0)),
            },
        )
    request_id = assert_error(response, status, code)
    assert request_id != str(UUID(int=0))
    assert request_id in caplog.text
    assert "private" not in response.text + caplog.text
    service.predict.assert_called_once()


@pytest.mark.parametrize("body", [b'{"count":', b'{"count":"private-value"}'])
def test_json_validation_errors(client, body):
    response = client.post(
        "/validation", content=body, headers={"Content-Type": "application/json"}
    )
    assert_error(response, 422, "validation_error")
    assert "private-value" not in response.text


def test_non_json_validation_context_is_sanitized(app_factory):
    class RejectedInput(BaseModel):
        value: str

        @field_validator("value")
        @classmethod
        def reject(cls, value: str) -> str:
            raise ValueError("private-validator-message")

    app = app_factory(Settings(_env_file=None, environment="test"))

    @app.post("/context")
    def context(body: RejectedInput):
        return body

    with TestClient(app) as client:
        response = client.post("/context", json={"value": "private-input"})
    assert_error(response, 422, "validation_error")
    assert "private" not in response.text


def test_response_validation_failure_is_generic(app_factory):
    app = app_factory(Settings(_env_file=None, environment="test"))

    @app.get("/invalid-response", response_model=Input)
    def invalid_response():
        return {"count": "private-response-value"}

    with TestClient(app) as client:
        response = client.get("/invalid-response")
    assert_error(response, 500, "internal_error")
    assert "private" not in response.text
