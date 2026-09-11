"""Crest blob → PNG base64 (mesmo fluxo do SITE)."""

import base64
import io

from PIL import Image

from apps.server.infrastructure.lineage.crests import crest_to_png_base64


def _png_bytes(width: int, height: int, color=(255, 0, 0, 255)) -> bytes:
    image = Image.new("RGBA", (width, height), color)
    out = io.BytesIO()
    image.save(out, format="PNG")
    return out.getvalue()


def test_crest_to_png_base64_resizes_clan_and_ally():
    blob = _png_bytes(32, 24)
    clan = crest_to_png_base64(blob, "clan")
    ally = crest_to_png_base64(blob, "ally")
    assert clan and ally and clan != ally

    clan_img = Image.open(io.BytesIO(base64.b64decode(clan)))
    ally_img = Image.open(io.BytesIO(base64.b64decode(ally)))
    assert clan_img.size == (16, 12)
    assert ally_img.size == (8, 12)


def test_crest_to_png_base64_empty_for_invalid():
    assert crest_to_png_base64(None) == ""
    assert crest_to_png_base64(b"") == ""
    assert crest_to_png_base64(b"not-an-image") == ""
