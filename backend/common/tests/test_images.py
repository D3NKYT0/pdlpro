"""O saneamento de imagens enviadas recusa o que não é imagem estática pequena."""

from __future__ import annotations

from io import BytesIO

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
from rest_framework import serializers

from common.images import MAX_IMAGE_BYTES, sanitize_uploaded_image


def upload(name: str, payload: bytes, content_type: str) -> SimpleUploadedFile:
    return SimpleUploadedFile(name, payload, content_type=content_type)


def image_bytes(fmt: str, size=(24, 24), **save_kwargs) -> bytes:
    buffer = BytesIO()
    mode = "RGBA" if fmt in {"PNG", "WEBP"} else "RGB"
    Image.new(mode, size, (10, 120, 200) + ((255,) if mode == "RGBA" else ())).save(
        buffer, format=fmt, **save_kwargs
    )
    return buffer.getvalue()


def animated_gif_bytes() -> bytes:
    buffer = BytesIO()
    frames = [Image.new("P", (8, 8), index) for index in (1, 2)]
    frames[0].save(buffer, format="GIF", save_all=True, append_images=frames[1:], duration=40)
    return buffer.getvalue()


def test_none_passes_through_for_optional_fields():
    assert sanitize_uploaded_image(None, filename="avatar.png") is None


@pytest.mark.parametrize("fmt", ["PNG", "JPEG", "WEBP"])
def test_allowed_formats_are_rewritten_as_png_with_the_requested_name(fmt):
    result = sanitize_uploaded_image(
        upload(f"origem.{fmt.lower()}", image_bytes(fmt), f"image/{fmt.lower()}"),
        filename="avatar.png",
    )

    assert result.name == "avatar.png"
    with Image.open(BytesIO(result.read())) as sanitized:
        assert sanitized.format == "PNG"
        assert sanitized.size == (24, 24)


def test_exif_orientation_is_applied_and_metadata_dropped():
    original = Image.new("RGB", (40, 20), (200, 30, 30))
    buffer = BytesIO()
    exif = original.getexif()
    exif[274] = 6  # orientação "rotacionar 90°"
    exif[271] = "Camera secreta"
    original.save(buffer, format="JPEG", exif=exif)

    result = sanitize_uploaded_image(
        upload("foto.jpg", buffer.getvalue(), "image/jpeg"), filename="avatar.png"
    )

    with Image.open(BytesIO(result.read())) as sanitized:
        assert sanitized.size == (20, 40)
        assert not sanitized.getexif()


def test_rejects_payload_above_two_megabytes():
    oversized = upload("grande.png", b"x" * (MAX_IMAGE_BYTES + 1), "image/png")

    with pytest.raises(serializers.ValidationError) as error:
        sanitize_uploaded_image(oversized, filename="avatar.png")

    assert "2 MB" in str(error.value)


@pytest.mark.parametrize(
    "name,payload,content_type",
    [
        ("animado.gif", animated_gif_bytes(), "image/gif"),
        ("estatico.gif", image_bytes("GIF"), "image/gif"),
        ("mapa.bmp", image_bytes("BMP"), "image/bmp"),
    ],
)
def test_rejects_formats_outside_the_allowlist(name, payload, content_type):
    with pytest.raises(serializers.ValidationError) as error:
        sanitize_uploaded_image(upload(name, payload, content_type), filename="icon.png")

    assert "PNG, JPEG" in str(error.value)


def test_rejects_dimensions_above_the_limit():
    with pytest.raises(serializers.ValidationError) as error:
        sanitize_uploaded_image(
            upload("larga.png", image_bytes("PNG", size=(1025, 10)), "image/png"),
            filename="icon.png",
        )

    assert "1024" in str(error.value)


@pytest.mark.parametrize(
    "payload",
    [
        b"<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>",
        b"\x89PNG\r\n\x1a\n" + b"lixo" * 8,
    ],
)
def test_rejects_content_that_is_not_a_readable_image(payload):
    with pytest.raises(serializers.ValidationError) as error:
        sanitize_uploaded_image(upload("payload.png", payload, "image/png"), filename="icon.png")

    assert "inválida" in str(error.value).lower()
