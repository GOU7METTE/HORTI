from collections.abc import Callable, Iterator
from unittest.mock import Mock
from uuid import UUID

import pytest
from fastapi import FastAPI, UploadFile
from fastapi.testclient import TestClient

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
    assert response.json()["detail"][0]["loc"] == ["body", "image"]
    service.predict.assert_not_called()


def test_unavailable_inference_does_not_read_upload(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    read = Mock(side_effect=AssertionError("Application must not read the image"))
    monkeypatch.setattr(UploadFile, "read", read)
    response = client.post(
        "/api/v1/predictions", files={"image": ("synthetic.png", b"not an image", "image/png")}
    )
    assert response.status_code == 503
    body = response.json()
    assert UUID(body["error"]["request_id"])
    assert body == {
        "error": {
            "code": "inference_unavailable",
            "message": "Model inference is unavailable.",
            "request_id": body["error"]["request_id"],
            "details": [],
        }
    }
    read.assert_not_called()


def test_route_delegates_to_service_and_closes_upload(client: TestClient) -> None:
    service = Mock(spec=PredictionService)
    service.predict.side_effect = InferenceUnavailable
    client.app.dependency_overrides[get_prediction_service] = lambda: service
    response = client.post(
        "/api/v1/predictions", files={"image": ("synthetic.png", b"synthetic", "image/png")}
    )
    assert response.status_code == 503
    service.predict.assert_called_once()
    upload = service.predict.call_args.args[0]
    assert upload.filename == "synthetic.png"
    assert upload.content_type == "image/png"
    assert upload.file.closed


def test_openapi_documents_multipart_and_unavailable(client: TestClient) -> None:
    schema = client.get("/openapi.json").json()
    operation = schema["paths"]["/api/v1/predictions"]["post"]
    assert operation["requestBody"]["required"] is True
    body_ref = operation["requestBody"]["content"]["multipart/form-data"]["schema"]["$ref"]
    body_schema = schema["components"]["schemas"][body_ref.rsplit("/", 1)[1]]
    assert body_schema["required"] == ["image"]
    assert body_schema["properties"]["image"]["type"] == "string"
    assert body_schema["properties"]["image"]["contentMediaType"] == "application/octet-stream"
    responses = operation["responses"]
    assert "200" not in responses
    assert responses["503"]["content"]["application/json"]["schema"] == {
        "$ref": "#/components/schemas/UnavailableResponse"
    }


@pytest.mark.parametrize(
    "origin,allowed", [("http://localhost:3000", True), ("https://other.example", False)]
)
def test_post_cors(client: TestClient, origin: str, allowed: bool) -> None:
    headers = {"Origin": origin, "Access-Control-Request-Method": "POST"}
    preflight = client.options("/api/v1/predictions", headers=headers)
    assert preflight.status_code == (200 if allowed else 400)
    response = client.post(
        "/api/v1/predictions",
        headers={"Origin": origin},
        files={"image": ("synthetic.png", b"synthetic", "image/png")},
    )
    assert response.status_code == 503
    assert ("access-control-allow-origin" in response.headers) is allowed
