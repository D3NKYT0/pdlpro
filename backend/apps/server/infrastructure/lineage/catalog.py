from __future__ import annotations

import re
from pathlib import Path

from common.architecture.exceptions import DomainError


class QueryDialectNotFoundError(DomainError):
    error_code = "LINEAGE_DIALECT_NOT_FOUND"
    status_code = 500
    message = "Dialeto de queries Lineage não encontrado."


class QueryNotFoundError(DomainError):
    error_code = "LINEAGE_QUERY_NOT_FOUND"
    status_code = 500
    message = "Query Lineage não encontrada no dialeto."


class LineageQueryCatalog:
    """
    Classe-mãe das queries do banco L2.

    Lê arquivos .sql do dialeto (lucerav2, dreamv3, …). Cada statement começa com:

        -- name: top_pvp

    O gateway não contém SQL: só pede o nome e executa.
    """

    ROOT = Path(__file__).resolve().parent / "queries"
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
    def load(cls, dialect: str) -> LineageQueryCatalog:
        folder = cls.ROOT / dialect
        if not folder.is_dir():
            available = ", ".join(sorted(p.name for p in cls.ROOT.iterdir() if p.is_dir())) or "(nenhum)"
            raise QueryDialectNotFoundError(
                f"Dialeto '{dialect}' não encontrado em {folder}. Disponíveis: {available}."
            )
        statements: dict[str, str] = {}
        for path in sorted(folder.glob("*.sql")):
            statements.update(cls._parse(path.read_text(encoding="utf-8")))
        return cls(dialect, statements)

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
