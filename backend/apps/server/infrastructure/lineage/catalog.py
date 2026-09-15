from __future__ import annotations

import json
import re
from collections.abc import Iterable
from pathlib import Path

from common.architecture.exceptions import DomainError


class QueryDialectNotFoundError(DomainError):
    """Falha de domínio: Dialeto de queries Lineage não encontrado.

    A apresentação expõe o código ``LINEAGE_DIALECT_NOT_FOUND`` com status HTTP 500. Lance esta
    exceção quando a condição ocorrer na regra de negócio.
    """

    error_code = "LINEAGE_DIALECT_NOT_FOUND"
    status_code = 500
    message = "Dialeto de queries Lineage não encontrado."


class QueryNotFoundError(DomainError):
    """Falha de domínio: Query Lineage não encontrada no dialeto.

    A apresentação expõe o código ``LINEAGE_QUERY_NOT_FOUND`` com status HTTP 500. Lance esta
    exceção quando a condição ocorrer na regra de negócio.
    """

    error_code = "LINEAGE_QUERY_NOT_FOUND"
    status_code = 500
    message = "Query Lineage não encontrada no dialeto."


class LineageQueryCatalog:
    """Carrega consultas SQL nomeadas de um dialeto de servidor Lineage.

    Use ``LineageQueryCatalog.load(dialeto)`` com um módulo configurado pelo servidor. Cada
    consulta em um arquivo .sql começa com ``-- name: nome``; ``get(nome)`` ou ``catalog[nome]``
    retorna o SQL para o gateway executar. A construção valida a presença das consultas REQUIRED
    e informa as ausentes. O catálogo lê arquivos, mas não abre conexões nem executa SQL. Nunca
    derive o diretório do dialeto diretamente de uma entrada HTTP.

    ``extra_roots`` recebe pastas ``infrastructure/lineage/queries`` de extensões instaladas.
    O core carrega primeiro; arquivos do mesmo dialeto nas extensões **sobrescrevem** consultas
    de mesmo ``-- name:``. SQL entra só como código de deploy — nunca por upload no admin.
    """

    ROOT = Path(__file__).resolve().parent / "queries"
    CONTRACT_REVISION = 1
    DIALECT_RE = re.compile(r"^[a-z][a-z0-9_]{0,63}$")
    NAME_RE = re.compile(r"^--\s*name:\s*([a-z0-9_]+)\s*$", re.IGNORECASE)
    REQUIRED = (
        "players_online",
        "top_pvp",
        "top_pk",
        "top_level",
        "top_online",
        "top_clans",
        "top_adena",
        "get_account",
        "find_accounts_by_email",
        "get_account_by_login_and_email",
        "get_account_password",
        "register_account",
        "link_account",
        "unlink_account",
        "update_account_password",
        "list_characters",
        "get_character",
        "nickname_exists",
        "change_nickname",
        "change_sex",
        "unstuck",
        "count_characters",
        "verify_character_ownership",
        "transfer_character",
        "list_character_items",
        "delete_item_stack",
        "update_item_amount",
        "find_character_id_by_name",
        "deposit_item",
    )

    def __init__(self, dialect: str, statements: dict[str, str]) -> None:
        self.dialect = dialect
        self._statements = statements
        missing = [name for name in self.REQUIRED if name not in statements]
        if missing:
            raise QueryNotFoundError(
                f"O dialeto '{dialect}' está incompleto. Faltam: {', '.join(missing)}."
            )

    def get(self, name: str) -> str:
        sql = self._statements.get(name)
        if not sql:
            raise QueryNotFoundError(f"Query '{name}' não existe no dialeto '{self.dialect}'.")
        return sql

    def __getitem__(self, name: str) -> str:
        return self.get(name)

    def has(self, name: str) -> bool:
        return name in self._statements

    @classmethod
    def load(cls, dialect: str, extra_roots: Iterable[Path] | None = None) -> LineageQueryCatalog:
        dialect = cls._normalize_dialect(dialect)
        statements: dict[str, str] = {}
        found = False
        for index, root in enumerate(cls._iter_roots(extra_roots)):
            folder = root / dialect
            if not folder.is_dir():
                continue
            found = True
            if index > 0:
                cls._validate_overlay_manifest(folder, dialect)
            for path in sorted(folder.glob("*.sql")):
                statements.update(cls._parse(path.read_text(encoding="utf-8")))
        if not found:
            available = ", ".join(cls.discover_dialects(extra_roots)) or "(nenhum)"
            raise QueryDialectNotFoundError(
                f"Dialeto '{dialect}' não encontrado. Disponíveis: {available}."
            )
        return cls(dialect, statements)

    @classmethod
    def discover_dialects(cls, extra_roots: Iterable[Path] | None = None) -> list[str]:
        """Nomes de pastas de dialeto no core e nas raízes extras (extensões)."""

        names: set[str] = set()
        for root in cls._iter_roots(extra_roots):
            if not root.is_dir():
                continue
            for path in root.iterdir():
                if path.is_dir() and cls.DIALECT_RE.fullmatch(path.name):
                    names.add(path.name)
        return sorted(names)

    @classmethod
    def _validate_overlay_manifest(cls, folder: Path, dialect: str) -> None:
        """Recusa overlay com ``core_revision`` diferente do contrato atual."""

        manifest_path = folder / "manifest.json"
        if not manifest_path.is_file():
            return
        try:
            data = json.loads(manifest_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            raise QueryNotFoundError(
                f"O manifest.json do dialeto '{dialect}' em {folder} é inválido."
            ) from exc
        expected = data.get("core_revision")
        if expected is None:
            return
        try:
            revision = int(expected)
        except (TypeError, ValueError) as exc:
            raise QueryNotFoundError(
                f"O overlay do dialeto '{dialect}' tem core_revision inválido."
            ) from exc
        if revision != cls.CONTRACT_REVISION:
            raise QueryNotFoundError(
                f"O overlay do dialeto '{dialect}' espera core_revision={revision}, "
                f"o core está em {cls.CONTRACT_REVISION}."
            )

    @classmethod
    def _normalize_dialect(cls, dialect: str) -> str:
        value = (dialect or "").strip().lower()
        if not cls.DIALECT_RE.fullmatch(value):
            raise QueryDialectNotFoundError(
                f"Dialeto '{dialect}' não encontrado. Disponíveis: {', '.join(cls.discover_dialects()) or '(nenhum)'}."
            )
        return value

    @classmethod
    def _iter_roots(cls, extra_roots: Iterable[Path] | None) -> list[Path]:
        roots = [cls.ROOT]
        for root in extra_roots or ():
            resolved = Path(root)
            if resolved.is_dir():
                roots.append(resolved)
        return roots

    @classmethod
    def _parse(cls, source: str) -> dict[str, str]:
        statements: dict[str, str] = {}
        current = ""
        chunks: list[str] = []
        for raw in source.splitlines():
            line = raw.rstrip()
            match = cls.NAME_RE.match(line.strip())
            if match:
                if current and chunks:
                    statements[current] = "\n".join(chunks).strip().rstrip(";")
                current = match.group(1)
                chunks = []
                continue
            if current:
                chunks.append(line)
        if current and chunks:
            statements[current] = "\n".join(chunks).strip().rstrip(";")
        return statements
