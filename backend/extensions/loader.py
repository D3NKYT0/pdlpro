"""Descoberta e montagem de apps de extensão do PDL.

Lê ``PDL_EXTENSION_APPS`` (lista separada por vírgula de AppConfig dotted paths),
valida o prefixo ``extensions.`` e expõe helpers usados por settings e URLconf.
Pacotes cujo nome começa com ``extensions._`` são scaffolding interno e só entram
na instalação se listados explicitamente na variável de ambiente.
"""

from __future__ import annotations

import logging
from collections.abc import Iterable
from importlib import import_module
from pathlib import Path

logger = logging.getLogger(__name__)

_EXTENSION_PREFIX = "extensions."
_PRIVATE_PREFIX = "extensions._"


def parse_extension_apps(raw: str | Iterable[str] | None) -> list[str]:
    """Normaliza a lista de AppConfig dotted paths a partir do ambiente.

    Aceita string com vírgulas ou uma sequência já tokenizada. Entradas vazias
    são ignoradas. Raise ``ValueError`` se algum item não começar com
    ``extensions.`` (evita registrar apps do core por engano nesta lista).
    """

    if raw is None:
        return []
    if isinstance(raw, str):
        tokens = [part.strip() for part in raw.split(",")]
    else:
        tokens = [str(part).strip() for part in raw]

    configs: list[str] = []
    for token in tokens:
        if not token:
            continue
        if not token.startswith(_EXTENSION_PREFIX):
            raise ValueError(
                "PDL_EXTENSION_APPS só aceita AppConfig sob extensions.*; "
                f"recebido: {token!r}"
            )
        configs.append(token)
    return configs


def merge_extension_apps(
    installed: list[str],
    extension_configs: Iterable[str] | None,
) -> list[str]:
    """Acrescenta apps de extensão ao ``INSTALLED_APPS`` sem duplicar entradas."""

    merged = list(installed)
    seen = set(merged)
    for config in extension_configs or ():
        if config in seen:
            continue
        merged.append(config)
        seen.add(config)
    return merged


def is_extension_app_name(name: str) -> bool:
    """Indica se o ``AppConfig.name`` pertence à árvore de extensões públicas."""

    return name.startswith(_EXTENSION_PREFIX) and not name.startswith(_PRIVATE_PREFIX)


def query_root_for_app(app_path: Path) -> Path | None:
    """Pasta ``infrastructure/lineage/queries`` da extensão, se existir."""

    candidate = Path(app_path) / "infrastructure" / "lineage" / "queries"
    return candidate if candidate.is_dir() else None


def lineage_query_roots() -> list[Path]:
    """Raízes SQL das extensões instaladas, na ordem de ``INSTALLED_APPS``.

    O catálogo Lineage carrega o core primeiro e aplica estas pastas por cima
    (consultas de mesmo nome substituem as do dialeto base). Scaffolding
    ``extensions._*`` entra se estiver instalado via ``PDL_EXTENSION_APPS``.
    """

    from django.apps import apps

    roots: list[Path] = []
    for config in apps.get_app_configs():
        if not config.name.startswith(_EXTENSION_PREFIX):
            continue
        root = query_root_for_app(Path(config.path))
        if root is not None:
            roots.append(root)
    return roots


def extension_urlpatterns():
    """Monta rotas ``extensions/<label>/`` para cada app de extensão instalado.

    Importa ``<app>.presentation.urls`` quando o módulo existir. Scaffolding
    ``extensions._*`` só é montado se estiver em ``INSTALLED_APPS`` (ativação
    explícita via ``PDL_EXTENSION_APPS``).
    """

    from django.apps import apps
    from django.urls import include, path

    patterns = []
    for config in apps.get_app_configs():
        name = config.name
        if not name.startswith(_EXTENSION_PREFIX):
            continue
        urls_module = f"{name}.presentation.urls"
        try:
            import_module(urls_module)
        except ModuleNotFoundError:
            logger.debug("Extensão %s sem presentation.urls; ignorada na URLconf", name)
            continue
        patterns.append(path(f"extensions/{config.label}/", include(urls_module)))
    return patterns
