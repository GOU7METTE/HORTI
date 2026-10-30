import asyncio
import struct
import zlib
from collections.abc import Callable, Iterator
from io import BytesIO
from unittest.mock import Mock
from uuid import UUID

import httpx
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from PIL import Image
from starlette.requests import ClientDisconnect, Request

from app.core.config import Settings
from app.services import image_upload
from app.services.image_upload import (
    MAX_FILE_BYTES,
    MAX_OVERHEAD_BYTES,
    MAX_REQUEST_BYTES,
    UploadRejected,
    consume_image,
)
from app.services.predictions import InferenceUnavailable, PredictionService, get_prediction_service


def image_bytes(fmt: str = "PNG", size: tuple[int, int] = (2, 2)) -> bytes:
    with BytesIO() as output, Image.new("L", size) as image:
        image.save(output, format=fmt)
        return output.getvalue()


def padded_png(length: int) -> bytes:
    data = image_bytes()
    payload = b"x" * (length - len(data) - 12)
    chunk = b"paDd" + payload
    return (
        data[:-12]
        + struct.pack(">I", len(payload))
        + chunk
        + struct.pack(">I", zlib.crc32(chunk))
        + data[-12:]
    )


def multipart(data: bytes, *, header: bytes = b"") -> bytes:
    return (
        b'--test\r\nContent-Disposition: form-data; name="image"; filename="../../leaf.png"\r\n'
        + header
        + b"\r\n"
        + data
        + b"\r\n--test--\r\n"
    )


def assert_upload_error(response: httpx.Response, status: int) -> None:
    codes = {
        400: "invalid_image",
        413: "payload_too_large",
        415: "unsupported_media_type",
        422: "validation_error",
        503: "inference_unavailable",
    }
    assert response.status_code == status
    request_id = response.headers["x-request-id"]
    assert UUID(request_id).version == 4
    body = response.json()
    assert set(body) == {"error"}
    assert set(body["error"]) == {"code", "message", "request_id", "details"}
    assert body["error"]["code"] == codes[status]
    assert body["error"]["request_id"] == request_id
    assert body["error"]["details"] == []
    assert isinstance(body["error"]["message"], str)


@pytest.fixture
def client(app_factory: Callable[[Settings], FastAPI]) -> Iterator[TestClient]:
    with TestClient(
        app_factory(Settings(_env_file=None, environment="test", cors_origins=[]))
    ) as client:
        yield client


@pytest.mark.parametrize("fmt", ["JPEG", "PNG"])
def test_decoded_format_overrides_filename_and_mime(client: TestClient, fmt: str) -> None:
    response = client.post(
        "/api/v1/predictions", files={"image": ("../../fake.exe", image_bytes(fmt), "text/plain")}
    )
    assert_upload_error(response, 503)


@pytest.mark.parametrize("length,status", [(MAX_FILE_BYTES, 503), (MAX_FILE_BYTES + 1, 413)])
def test_exact_file_size_boundary(client: TestClient, length: int, status: int) -> None:
    service = Mock(spec=PredictionService)
    service.predict.side_effect = InferenceUnavailable
    client.app.dependency_overrides[get_prediction_service] = lambda: service
    data = padded_png(length)
    assert len(data) == length
    response = client.post("/api/v1/predictions", files={"image": ("leaf.png", data, "image/png")})
    assert_upload_error(response, status)
    if status == 503:
        service.predict.assert_called_once_with(data)
    else:
        service.predict.assert_not_called()


@pytest.mark.parametrize("height,status", [(4000, 503), (4001, 413)])
def test_exact_pixel_boundary(client: TestClient, height: int, status: int) -> None:
    service = Mock(spec=PredictionService)
    service.predict.side_effect = InferenceUnavailable
    client.app.dependency_overrides[get_prediction_service] = lambda: service
    data = image_bytes(size=(5000, height))
    response = client.post(
        "/api/v1/predictions",
        files={"image": ("leaf.png", data, "image/png")},
    )
    assert_upload_error(response, status)
    if status == 503:
        service.predict.assert_called_once_with(data)
    else:
        service.predict.assert_not_called()


@pytest.mark.parametrize(
    "data,status",
    [
        (b"", 400),
        (b"not an image", 400),
        (image_bytes()[:-15], 400),
        (image_bytes("JPEG")[:-10], 400),
        (image_bytes("GIF"), 415),
        (image_bytes("BMP"), 415),
        (image_bytes("WEBP"), 415),
    ],
)
def test_invalid_content_never_reaches_inference(
    client: TestClient, data: bytes, status: int
) -> None:
    service = Mock(spec=PredictionService)
    client.app.dependency_overrides[get_prediction_service] = lambda: service
    response = client.post("/api/v1/predictions", files={"image": ("leaf.png", data, "image/png")})
    assert_upload_error(response, status)
    service.predict.assert_not_called()


def test_animated_png_rejected(client: TestClient) -> None:
    with (
        BytesIO() as output,
        Image.new("RGB", (2, 2), "red") as first,
        Image.new("RGB", (2, 2), "blue") as second,
    ):
        first.save(output, format="PNG", save_all=True, append_images=[second], duration=100)
        response = client.post(
            "/api/v1/predictions", files={"image": ("leaf.png", output.getvalue())}
        )
    assert response.status_code == 400


@pytest.mark.parametrize("extra", ["image", "other"])
def test_duplicate_or_extra_file_rejected(client: TestClient, extra: str) -> None:
    response = client.post(
        "/api/v1/predictions",
        files=[
            ("image", ("one.png", image_bytes())),
            (extra, ("two.png", image_bytes())),
        ],
    )
    assert response.status_code == 400


def test_extra_field_and_nonfile_rejected(client: TestClient) -> None:
    assert (
        client.post(
            "/api/v1/predictions", data={"extra": "x"}, files={"image": ("a.png", image_bytes())}
        ).status_code
        == 400
    )
    assert client.post("/api/v1/predictions", files={"image": (None, "text")}).status_code == 422


@pytest.mark.parametrize(
    "body,content_type",
    [
        (b"garbage", "multipart/form-data; boundary=test"),
        (multipart(image_bytes())[:-12], "multipart/form-data; boundary=test"),
        (b"", "multipart/form-data"),
        (b"", "multipart/form-data; boundary=" + "x" * 71),
        (b"", 'multipart/form-data; boundary="bad@boundary"'),
    ],
)
def test_malformed_multipart(client: TestClient, body: bytes, content_type: str) -> None:
    assert (
        client.post(
            "/api/v1/predictions", content=body, headers={"Content-Type": content_type}
        ).status_code
        == 400
    )


def test_part_header_limit(client: TestClient) -> None:
    body = multipart(image_bytes(), header=b"X-Large: " + b"x" * 9000 + b"\r\n")
    assert (
        client.post(
            "/api/v1/predictions",
            content=body,
            headers={"Content-Type": "multipart/form-data; boundary=test"},
        ).status_code
        == 413
    )


@pytest.mark.parametrize(
    "overhead,status", [(MAX_OVERHEAD_BYTES, 503), (MAX_OVERHEAD_BYTES + 1, 413)]
)
def test_exact_overhead_boundary(client: TestClient, overhead: int, status: int) -> None:
    data = padded_png(MAX_FILE_BYTES)
    body = multipart(data)
    body += b" " * (overhead - (len(body) - len(data)))
    assert len(body) == MAX_FILE_BYTES + overhead
    response = client.post(
        "/api/v1/predictions",
        content=body,
        headers={"Content-Type": "multipart/form-data; boundary=test"},
    )
    assert_upload_error(response, status)


@pytest.mark.parametrize("declared", [None, "1"])
def test_stream_limit_without_trusting_content_length(
    app_factory: Callable[[Settings], FastAPI], declared: str | None
) -> None:
    app = app_factory(Settings(_env_file=None, environment="test", cors_origins=[]))
    yielded = []

    async def run():
        async def stream():
            # Reject an over-limit ASGI chunk before parsing; do not consume the next.
            yielded.append(1)
            yield b"x" * (MAX_REQUEST_BYTES + 1)
            yielded.append(2)
            yield b"should not be consumed"

        headers = {"Content-Type": "multipart/form-data; boundary=test"}
        if declared is not None:
            headers["Content-Length"] = declared
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as client:
            return await client.post("/api/v1/predictions", content=stream(), headers=headers)

    assert asyncio.run(run()).status_code == 413
    assert yielded == [1]


def test_small_chunks_enforce_file_limit_before_end(
    app_factory: Callable[[Settings], FastAPI],
) -> None:
    app = app_factory(Settings(_env_file=None, environment="test", cors_origins=[]))
    yielded = []
    body = multipart(b"x" * (MAX_FILE_BYTES + 100_000))

    async def run():
        async def stream():
            for start in range(0, len(body), 8192):
                yielded.append(start)
                yield body[start : start + 8192]

        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as client:
            return await client.post(
                "/api/v1/predictions",
                content=stream(),
                headers={"Content-Type": "multipart/form-data; boundary=test"},
            )

    assert asyncio.run(run()).status_code == 413
    assert yielded[-1] + 8192 < len(body)


@pytest.mark.parametrize(
    "data",
    [image_bytes(), b"invalid", b"x" * (MAX_FILE_BYTES + 1)],
    ids=["valid", "corrupt", "oversized"],
)
def test_cleanup_without_spooling(
    client: TestClient, monkeypatch: pytest.MonkeyPatch, data: bytes
) -> None:
    parsers = []
    original = image_upload.ImageMultipart

    class TrackingMultipart(original):
        def __init__(self, boundary):
            super().__init__(boundary)
            parsers.append(self)

    monkeypatch.setattr(image_upload, "ImageMultipart", TrackingMultipart)
    monkeypatch.setattr(
        "tempfile.SpooledTemporaryFile", Mock(side_effect=AssertionError("No spooling"))
    )
    client.post("/api/v1/predictions", files={"image": ("../../ignored.png", data)})
    assert parsers
    assert all(not parser.data and not parser.headers for parser in parsers)


def test_disconnect_clears_partial_upload(monkeypatch: pytest.MonkeyPatch) -> None:
    parsers = []
    original = image_upload.ImageMultipart

    class TrackingMultipart(original):
        def __init__(self, boundary):
            super().__init__(boundary)
            parsers.append(self)

    monkeypatch.setattr(image_upload, "ImageMultipart", TrackingMultipart)
    messages = iter(
        [
            {"type": "http.request", "body": multipart(b"partial")[:-12], "more_body": True},
            {"type": "http.disconnect"},
        ]
    )

    async def receive():
        return next(messages)

    request = Request(
        {"type": "http", "headers": [(b"content-type", b"multipart/form-data; boundary=test")]},
        receive,
    )
    with pytest.raises(ClientDisconnect):
        asyncio.run(consume_image(request))
    assert parsers and not parsers[0].data


def test_oversized_dimensions_rejected_before_decode(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    data = bytearray(image_bytes())
    data[16:24] = struct.pack(">II", 5000, 4001)
    data[29:33] = struct.pack(">I", zlib.crc32(data[12:29]))
    monkeypatch.setattr(
        "PIL.PngImagePlugin.PngImageFile.load",
        Mock(side_effect=AssertionError("No decoding oversized image")),
    )
    assert (
        client.post("/api/v1/predictions", files={"image": ("x.png", bytes(data))}).status_code
        == 413
    )


def test_decoder_buffers_close(monkeypatch: pytest.MonkeyPatch) -> None:
    buffers = []

    class TrackingBuffer(BytesIO):
        def __init__(self, data):
            super().__init__(data)
            buffers.append(self)

    monkeypatch.setattr(image_upload, "BytesIO", TrackingBuffer)
    image_upload.validate_image(image_bytes())
    with pytest.raises(UploadRejected):
        image_upload.validate_image(b"corrupt")
    assert buffers and all(buffer.closed for buffer in buffers)


def test_successful_stream_split_at_every_byte(
    app_factory: Callable[[Settings], FastAPI],
) -> None:
    app = app_factory(Settings(_env_file=None, environment="test", cors_origins=[]))

    async def run():
        async def stream():
            for byte in multipart(image_bytes("JPEG")):
                yield bytes([byte])

        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as client:
            return await client.post(
                "/api/v1/predictions",
                content=stream(),
                headers={"Content-Type": "multipart/form-data; boundary=test"},
            )

    assert asyncio.run(run()).status_code == 503


def test_duplicate_headers_and_header_count(client: TestClient) -> None:
    for header, expected in [
        (b"X-Test: one\r\nX-Test: two\r\n", 400),
        (b"".join(f"X-{i}: value\r\n".encode() for i in range(8)), 413),
    ]:
        response = client.post(
            "/api/v1/predictions",
            content=multipart(image_bytes(), header=header),
            headers={"Content-Type": "multipart/form-data; boundary=test"},
        )
        assert response.status_code == expected


def test_overhead_limit_also_applies_to_small_files(client: TestClient) -> None:
    data = image_bytes()
    body = multipart(data) + b" " * MAX_OVERHEAD_BYTES
    assert len(body) < MAX_REQUEST_BYTES
    response = client.post(
        "/api/v1/predictions",
        content=body,
        headers={"Content-Type": "multipart/form-data; boundary=test"},
    )
    assert response.status_code == 413


@pytest.mark.parametrize("size,status", [(4224, 503), (4225, 413)])
def test_parser_header_line_boundary(client: TestClient, size: int, status: int) -> None:
    header = b"X-Test: " + b"x" * (size - len(b"X-Test: ")) + b"\r\n"
    response = client.post(
        "/api/v1/predictions",
        content=multipart(image_bytes(), header=header),
        headers={"Content-Type": "multipart/form-data; boundary=test"},
    )
    assert_upload_error(response, status)


def test_parser_buffer_cleared_on_malformed_body(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    parsers = []
    original = image_upload.ImageMultipart

    class TrackingMultipart(original):
        def __init__(self, boundary):
            super().__init__(boundary)
            parsers.append(self)

    monkeypatch.setattr(image_upload, "ImageMultipart", TrackingMultipart)
    response = client.post(
        "/api/v1/predictions",
        content=multipart(image_bytes())[:-12],
        headers={"Content-Type": "multipart/form-data; boundary=test"},
    )
    assert response.status_code == 400
    assert parsers and not parsers[0].data and not parsers[0].headers
