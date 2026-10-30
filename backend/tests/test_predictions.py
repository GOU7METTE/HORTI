from collections.abc import Callable, Iterator
from io import BytesIO
from unittest.mock import Mock
from uuid import UUID

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from PIL import Image

from app.core.config import Settings
from app.services.predictions import (
    InferenceUnavailable,
    PredictionService,
    get_prediction_service,
)


@pytest.fixture
def client(app_factory: Callable[[Settings], FastAPI]) -> Iterator[TestClient]:
    app = app_factory(
        Settings(_env_file=None, environment="test", cors_origins=["http://localhost:3000"])
    )
    with TestClient(app) as client:
        yield client


def test_missing_image_does_not_call_service(client: TestClient) -> None:
    service = Mock(spec=PredictionService)
    client.app.dependency_overrides[get_prediction_service] = lambda: service
    response = client.post("/api/v1/predictions")
    assert response.status_code == 422
    assert "multipart image file" in response.json()["error"]["message"]
    service.predict.assert_not_called()


def synthetic_png() -> bytes:
    with BytesIO() as output:
        Image.new("RGB", (2, 2), "green").save(output, format="PNG")
        return output.getvalue()


def test_valid_image_receives_unavailable(client: TestClient) -> None:
    response = client.post(
        "/api/v1/predictions", files={"image": ("synthetic.png", synthetic_png(), "image/png")}
    )
    assert response.status_code == 503
    body = response.json()
    assert UUID(body["error"]["request_id"])
    assert body["error"]["request_id"] == response.headers["x-request-id"]
    assert body == {
        "error": {
            "code": "inference_unavailable",
            "message": "Model inference is unavailable.",
            "request_id": body["error"]["request_id"],
            "details": [],
        }
    }


def test_route_delegates_validated_bytes_to_service(client: TestClient) -> None:
    service = Mock(spec=PredictionService)
    service.predict.side_effect = InferenceUnavailable
    client.app.dependency_overrides[get_prediction_service] = lambda: service
    response = client.post(
        "/api/v1/predictions", files={"image": ("synthetic.png", synthetic_png(), "image/png")}
    )
    assert response.status_code == 503
    service.predict.assert_called_once()
    assert service.predict.call_args.args == (synthetic_png(),)


def test_openapi_documents_multipart_and_unavailable(client: TestClient) -> None:
    schema = client.get("/openapi.json").json()
    operation = schema["paths"]["/api/v1/predictions"]["post"]
    assert operation["requestBody"]["required"] is True
    body_schema = operation["requestBody"]["content"]["multipart/form-data"]["schema"]
    assert body_schema["required"] == ["image"]
    assert body_schema["additionalProperties"] is False
    assert body_schema["properties"]["image"]["format"] == "binary"
    responses = operation["responses"]
    assert "200" not in responses
    assert responses["503"]["content"]["application/json"]["schema"] == {
        "$ref": "#/components/schemas/UnavailableResponse"
    }


@pytest.mark.parametrize(
    "origin,allowed", [("http://localhost:3000", True), ("https://other.example", False)]
)
@pytest.mark.parametrize(
    "case,status,code",
    [
        ("valid", 503, "inference_unavailable"),
        ("corrupt", 400, "invalid_image"),
        ("missing", 422, "validation_error"),
        ("unexpected", 500, "internal_error"),
    ],
)
def test_post_cors(
    client: TestClient,
    origin: str,
    allowed: bool,
    case: str,
    status: int,
    code: str,
    caplog: pytest.LogCaptureFixture,
) -> None:
    service = Mock(spec=PredictionService)
    service.predict.side_effect = (
        RuntimeError("private-service-error") if case == "unexpected" else InferenceUnavailable
    )
    client.app.dependency_overrides[get_prediction_service] = lambda: service
    headers = {
        "Origin": origin,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Content-Type",
    }
    preflight = client.options("/api/v1/predictions", headers=headers)
    assert preflight.status_code == (200 if allowed else 400)
    assert UUID(preflight.headers["x-request-id"]).version == 4
    data = b"private-corrupt-input" if case == "corrupt" else synthetic_png()
    files = None if case == "missing" else {"image": ("private-filename.png", data, "image/png")}
    response = client.post("/api/v1/predictions", headers={"Origin": origin}, files=files)
    assert response.status_code == status
    request_id = response.headers["x-request-id"]
    assert UUID(request_id).version == 4
    assert request_id != preflight.headers["x-request-id"]
    body = response.json()
    assert set(body) == {"error"}
    assert set(body["error"]) == {"code", "message", "request_id", "details"}
    assert body["error"]["request_id"] == request_id
    assert body["error"]["code"] == code
    assert body["error"]["details"] == []
    records = [
        record
        for record in caplog.records
        if record.name == "horti.errors" and request_id in record.getMessage()
    ]
    assert len(records) == 1
    assert f"status={status}" in records[0].getMessage()
    assert records[0].exc_info is None
    assert "private" not in response.text + caplog.text
    if allowed:
        assert response.headers["access-control-allow-origin"] == origin
        exposed = response.headers["access-control-expose-headers"].lower().split(", ")
        assert "x-request-id" in exposed
    else:
        assert "access-control-allow-origin" not in response.headers
    if case in {"valid", "unexpected"}:
        service.predict.assert_called_once_with(data)
    else:
        service.predict.assert_not_called()
