"""Limites de cabelo, cor e rosto da crônica Interlude."""

from __future__ import annotations

from common.architecture.exceptions import ValidationDomainError

HAIR_STYLE_MAX_MALE = 4
HAIR_STYLE_MAX_FEMALE = 6
HAIR_COLOR_MAX = 3
FACE_MAX = 2


def appearance_catalog() -> dict[str, int]:
    """Limites numéricos do visual; a SPA monta as opções."""

    return {
        "hair_style_max_male": HAIR_STYLE_MAX_MALE,
        "hair_style_max_female": HAIR_STYLE_MAX_FEMALE,
        "hair_color_max": HAIR_COLOR_MAX,
        "face_max": FACE_MAX,
    }


def parse_appearance(value: str, sex: int) -> tuple[int, int, int]:
    """Interpreta ``estilo,cor,rosto`` e valida contra o sexo do personagem."""

    parts = [item.strip() for item in (value or "").split(",")]
    if len(parts) != 3:
        raise ValidationDomainError("Informe estilo, cor e rosto do personagem.")
    try:
        hair_style, hair_color, face = (int(parts[0]), int(parts[1]), int(parts[2]))
    except ValueError as exc:
        raise ValidationDomainError("Visual do personagem inválido.") from exc
    max_style = HAIR_STYLE_MAX_FEMALE if sex == 1 else HAIR_STYLE_MAX_MALE
    if not 0 <= hair_style <= max_style:
        raise ValidationDomainError("Estilo de cabelo inválido para este personagem.")
    if not 0 <= hair_color <= HAIR_COLOR_MAX:
        raise ValidationDomainError("Cor de cabelo inválida.")
    if not 0 <= face <= FACE_MAX:
        raise ValidationDomainError("Rosto inválido.")
    return hair_style, hair_color, face


def appearance_value(hair_style: int, hair_color: int, face: int) -> str:
    """Serializa o visual no formato persistido na operação de serviço."""

    return f"{hair_style},{hair_color},{face}"
