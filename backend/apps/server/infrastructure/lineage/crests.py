"""Converte blobs de crest do Lineage (clan/ally) em PNG base64, como no SITE."""

from __future__ import annotations

import base64
import io
from typing import Literal

from PIL import Image

CrestType = Literal["clan", "ally"]


def crest_to_png_base64(blob: bytes | memoryview | None, crest_type: CrestType = "clan") -> str:
    """Retorna PNG em base64; string vazia se o blob for inválido ou ausente."""
    if blob is None:
        return ""
    raw = bytes(blob)
    if not raw:
        return ""
    size = (8, 12) if crest_type == "ally" else (16, 12)
    try:
        image = Image.open(io.BytesIO(raw)).convert("RGBA").resize(size, Image.LANCZOS)
    except OSError:
        return ""
    out = io.BytesIO()
    image.save(out, format="PNG")
    return base64.b64encode(out.getvalue()).decode("ascii")
