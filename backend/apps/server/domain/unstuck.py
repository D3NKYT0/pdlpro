"""Destino administrativo de destravamento; None preserva o padrão do servidor."""
from apps.server.domain.character_creation import integer
from common.architecture.exceptions import ValidationDomainError


def normalize_unstuck(raw):
    """Valida as três coordenadas inteiras antes de persistir ou enviar ao jogo."""
    if raw is None:
        return None
    if not isinstance(raw, dict) or set(raw) != {"x", "y", "z"}:
        raise ValidationDomainError("Destino de destravamento inválido. Informe X, Y e Z como inteiros entre -2147483648 e 2147483647.")
    try:
        return {axis: integer(raw[axis], -2147483648, 2147483647) for axis in ("x", "y", "z")}
    except ValidationDomainError as exc:
        raise ValidationDomainError("Destino de destravamento inválido. Informe X, Y e Z como inteiros entre -2147483648 e 2147483647.") from exc
