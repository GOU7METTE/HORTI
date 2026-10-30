"""Bounded, in-memory multipart ingestion and decoded image validation."""

from io import BytesIO

from PIL import Image, UnidentifiedImageError
from python_multipart import MultipartParser
from python_multipart.exceptions import MultipartParseError
from python_multipart.multipart import parse_options_header
from starlette.requests import Request

MAX_FILE_BYTES = 5 * 1024 * 1024
MAX_PIXELS = 20_000_000
MAX_OVERHEAD_BYTES = 64 * 1024
MAX_REQUEST_BYTES = MAX_FILE_BYTES + MAX_OVERHEAD_BYTES
MAX_PART_HEADER_BYTES = 8 * 1024
PARSER_CHUNK_BYTES = 64 * 1024
BOUNDARY_CHARACTERS = frozenset(
    b"0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'()+_,-./:=? "
)


class UploadRejected(Exception):
    def __init__(self, status_code: int, message: str) -> None:
        self.status_code = status_code
        self.message = message


class ImageMultipart:
    """One part, no temporary files; callback limits apply before buffering data."""

    def __init__(self, boundary: bytes) -> None:
        self.data = bytearray()
        self.parts = 0
        self.complete = False
        self.header_bytes = 0
        self.header_name = bytearray()
        self.header_value = bytearray()
        self.headers: dict[bytes, bytes] = {}
        self.parser = MultipartParser(
            boundary,
            callbacks={
                "on_part_begin": self.part_begin,
                "on_header_field": self.header_field,
                "on_header_value": self.header_value_data,
                "on_header_end": self.header_end,
                "on_headers_finished": self.headers_finished,
                "on_part_data": self.part_data,
                "on_end": self.end,
            },
        )

    def part_begin(self) -> None:
        self.parts += 1
        if self.parts > 1:
            raise UploadRejected(
                400, "Exactly one image file is required; extra parts are forbidden."
            )

    def add_header(self, target: bytearray, data: bytes, start: int, end: int) -> None:
        self.header_bytes += end - start
        if self.header_bytes > MAX_PART_HEADER_BYTES:
            raise UploadRejected(413, "Multipart part headers are too large.")
        target.extend(data[start:end])

    def header_field(self, data: bytes, start: int, end: int) -> None:
        self.add_header(self.header_name, data, start, end)

    def header_value_data(self, data: bytes, start: int, end: int) -> None:
        self.add_header(self.header_value, data, start, end)

    def header_end(self) -> None:
        name = bytes(self.header_name).lower()
        if name in self.headers:
            raise UploadRejected(400, "Duplicate multipart headers are forbidden.")
        self.headers[name] = bytes(self.header_value)
        self.header_name.clear()
        self.header_value.clear()

    def headers_finished(self) -> None:
        disposition, options = parse_options_header(self.headers.get(b"content-disposition", b""))
        if disposition != b"form-data" or options.get(b"name") != b"image":
            raise UploadRejected(400, "Only the image file field is accepted.")
        if b"filename" not in options or not options[b"filename"]:
            raise UploadRejected(422, "The image field must be a file.")
        # Neither the filename nor declared Content-Type is used to identify the image.

    def part_data(self, data: bytes, start: int, end: int) -> None:
        if len(self.data) + end - start > MAX_FILE_BYTES:
            raise UploadRejected(413, "Image exceeds 5 MiB.")
        self.data.extend(data[start:end])

    def end(self) -> None:
        self.complete = True


async def consume_image(request: Request) -> bytes:
    """Count actual ASGI bytes before passing bounded slices to the multipart parser."""
    content_type = request.headers.get("content-type", "")
    if len(content_type) > 256:
        raise UploadRejected(400, "Invalid multipart Content-Type.")
    media_type, options = parse_options_header(content_type)
    if media_type != b"multipart/form-data":
        raise UploadRejected(422, "A multipart image file is required.")
    boundary = options.get(b"boundary", b"")
    if (
        not boundary
        or len(boundary) > 70
        or boundary.endswith(b" ")
        or any(c not in BOUNDARY_CHARACTERS for c in boundary)
    ):
        raise UploadRejected(400, "Invalid multipart boundary.")
    upload = ImageMultipart(boundary)
    total = 0
    parsed = 0
    try:
        async for chunk in request.stream():
            # The ASGI server owns the incoming chunk; never copy or parse an over-limit chunk.
            total += len(chunk)
            if total > MAX_REQUEST_BYTES:
                raise UploadRejected(413, "Multipart request exceeds 5 MiB plus 64 KiB overhead.")
            for start in range(0, len(chunk), PARSER_CHUNK_BYTES):
                part = chunk[start : start + PARSER_CHUNK_BYTES]
                upload.parser.write(part)
                parsed += len(part)
                if parsed - len(upload.data) > MAX_OVERHEAD_BYTES:
                    raise UploadRejected(413, "Multipart overhead exceeds 64 KiB.")
        upload.parser.finalize()
        # finalize() does not check completeness in the installed python-multipart version.
        if not upload.complete or upload.parts != 1:
            raise UploadRejected(400, "Incomplete multipart image request.")
        if total - len(upload.data) > MAX_OVERHEAD_BYTES:
            raise UploadRejected(413, "Multipart overhead exceeds 64 KiB.")
        return bytes(upload.data)
    except MultipartParseError as exc:
        if str(exc).startswith("Maximum header"):
            raise UploadRejected(413, "Multipart part header limit exceeded.") from exc
        raise UploadRejected(400, "Malformed multipart image request.") from exc
    finally:
        # No files or shared state are created, including on disconnect/cancellation/error.
        upload.data.clear()
        upload.headers.clear()
        upload.header_name.clear()
        upload.header_value.clear()


def validate_image(data: bytes) -> bytes:
    """Verify structure, then fully decode; do not perform model-specific transforms."""
    try:
        with BytesIO(data) as source, Image.open(source) as image:
            if image.format not in {"JPEG", "PNG"}:
                raise UploadRejected(415, "Only JPEG and PNG images are supported.")
            if image.width * image.height > MAX_PIXELS:
                raise UploadRejected(413, "Image exceeds 20 megapixels.")
            if getattr(image, "n_frames", 1) != 1:
                raise UploadRejected(400, "Animated images are not supported.")
            image.verify()
        # verify() invalidates the decoder; reopen to catch truncated pixel data as well.
        with BytesIO(data) as source, Image.open(source) as image:
            image.load()
    except Image.DecompressionBombError as exc:
        raise UploadRejected(413, "Image exceeds 20 megapixels.") from exc
    except (UnidentifiedImageError, OSError, ValueError, SyntaxError) as exc:
        raise UploadRejected(400, "Unable to decode image.") from exc
    return data
