from __future__ import annotations

from uuid import UUID

from common.architecture.exceptions import ValidationDomainError


def parse_optional_uuid(value) -> UUID | None:
    """Converte um identificador opcional; recusa texto que não seja UUID."""

    if value in (None, ""):
        return None
    try:
        return UUID(str(value))
    except ValueError:
        raise ValidationDomainError("Identificador inválido.") from None


def parse_required_uuid(value) -> UUID:
    """Exige um UUID válido para atualização ou exclusão."""

    parsed = parse_optional_uuid(value)
    if parsed is None:
        raise ValidationDomainError("Identificador inválido.")
    return parsed


def parse_required_datetime(raw, *, missing_message: str):
    """Interpreta data/hora ISO 8601 obrigatória no fuso da aplicação."""

    from django.utils import timezone
    from django.utils.dateparse import parse_datetime

    if raw in (None, ""):
        raise ValidationDomainError(missing_message)
    text = str(raw).strip().replace("Z", "+00:00")
    parsed = parse_datetime(text)
    if parsed is None:
        raise ValidationDomainError("Informe datas de início e fim em formato ISO 8601.")
    if timezone.is_naive(parsed):
        parsed = timezone.make_aware(parsed, timezone.get_current_timezone())
    return parsed


def parse_non_negative_int(raw, *, default: int = 0) -> int:
    try:
        value = int(raw if raw not in (None, "") else default)
    except (TypeError, ValueError):
        raise ValidationDomainError("Informe um número inteiro válido.") from None
    if value < 0:
        raise ValidationDomainError("Informe um número inteiro válido.")
    return value
