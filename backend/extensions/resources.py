"""Recursos (Programs) declarados por extensões, sincronizados em SystemResource."""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass

logger = logging.getLogger(__name__)

_RESOURCE_CODE = re.compile(r"^ext\.[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$")


@dataclass(frozen=True, slots=True)
class ExtensionResource:
    """Chave ligável no Controle de recursos. ``code`` deve ser ``ext.<id>.<slug>``."""

    code: str
    name: str
    category: str = "Extensões"
    description: str = ""
    enabled: bool = True

    def __post_init__(self) -> None:
        if not _RESOURCE_CODE.fullmatch(self.code):
            raise ValueError(
                "Recurso de extensão deve usar o código ext.<id>.<slug> "
                f"(recebido: {self.code!r})."
            )


class ExtensionResourceCatalog:
    """Catálogo de processo. Extensões chamam ``add`` em ``AppConfig.ready()``."""

    _items: list[ExtensionResource] = []

    @classmethod
    def add(cls, resource: ExtensionResource) -> None:
        cls._items = [item for item in cls._items if item.code != resource.code]
        cls._items.append(resource)

    @classmethod
    def all(cls) -> list[ExtensionResource]:
        return list(cls._items)

    @classmethod
    def reset(cls) -> None:
        """Reservado a testes."""

        cls._items = []


def declare_extension_resource(resource: ExtensionResource) -> ExtensionResource:
    """Registra o recurso no catálogo. Idempotente por ``code``."""

    ExtensionResourceCatalog.add(resource)
    return resource


def sync_extension_resources() -> int:
    """Garante linhas em ``SystemResource`` para o catálogo atual.

    Não sobrescreve ``enabled`` já gravado pela staff. Retorna quantas linhas criou.
    """

    from apps.programs.models import SystemResource

    created = 0
    for item in ExtensionResourceCatalog.all():
        _, was_created = SystemResource.objects.get_or_create(
            code=item.code,
            defaults={
                "name": str(item.name),
                "category": str(item.category),
                "description": str(item.description),
                "enabled": item.enabled,
            },
        )
        if was_created:
            created += 1
            logger.info("Recurso de extensão criado: %s", item.code)
    return created
