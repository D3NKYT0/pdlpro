"""Saneamento de imagens enviadas por usuários (avatares, ícones, apoiadores)."""

from __future__ import annotations

from io import BytesIO

from django.core.files.base import ContentFile
from django.utils.translation import gettext as _
from PIL import Image, ImageOps
from rest_framework import serializers

MAX_IMAGE_BYTES = 2 * 1024 * 1024
MAX_IMAGE_SIDE = 1024
ALLOWED_IMAGE_FORMATS = frozenset({"PNG", "JPEG", "WEBP"})


def sanitize_uploaded_image(value, *, filename: str):
    """Reescreve a imagem recebida como PNG estático, sem metadados nem payload ativo.

    Use em ``validate_<campo>`` de serializers que aceitam upload de imagem. Recusa arquivos
    acima de 2 MB, formatos fora de PNG/JPEG/WebP, animações e lados maiores que 1024 pixels,
    levantando ``serializers.ValidationError`` traduzida. O retorno é um ``ContentFile`` com o
    nome informado, pronto para gravar no campo de arquivo: os bytes originais — que podem
    carregar SVG, script ou EXIF — nunca são persistidos. ``None`` passa direto para permitir
    campos opcionais.
    """

    if value is None:
        return value
    if value.size > MAX_IMAGE_BYTES:
        raise serializers.ValidationError(_("A imagem deve ter no máximo 2 MB."))
    try:
        value.seek(0)
        with Image.open(value) as image:
            if image.format not in ALLOWED_IMAGE_FORMATS or getattr(image, "is_animated", False):
                raise serializers.ValidationError(_("Use PNG, JPEG ou WebP estático."))
            if max(image.size) > MAX_IMAGE_SIDE:
                raise serializers.ValidationError(_("Dimensões máximas: 1024 × 1024 pixels."))
            clean = ImageOps.exif_transpose(image).convert("RGBA")
            sanitized = Image.new("RGBA", clean.size)
            sanitized.paste(clean)
            output = BytesIO()
            sanitized.save(output, format="PNG")
    except (OSError, ValueError, Image.DecompressionBombError):
        raise serializers.ValidationError(_("Imagem inválida.")) from None
    return ContentFile(output.getvalue(), name=filename)
