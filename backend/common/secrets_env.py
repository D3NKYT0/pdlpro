"""Leitura/escrita segura de segredos no ``.env`` e utilitários de rotação.

Usado pelo configurador (via equivalência bash), pelos casos de uso de staff e
pelos testes. Não registra valores em claro — só fingerprints e metadados.
"""

from __future__ import annotations

import hashlib
import os
import re
import secrets
import tempfile
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

CSV_SPLIT = re.compile(r"\s*,\s*")
MAX_SECRET_FALLBACKS = 3
MAX_DATA_FALLBACKS = 3


def fingerprint(value: str, *, length: int = 12) -> str:
    """SHA-256 truncado do segredo; seguro para exibir no painel."""

    material = (value or "").encode("utf-8")
    return hashlib.sha256(material).hexdigest()[:length]


def parse_csv_values(raw: str | None) -> list[str]:
    """Divide uma lista CSV de env, descartando vazios."""

    if not raw or not str(raw).strip():
        return []
    return [part for part in CSV_SPLIT.split(str(raw).strip()) if part]


def join_csv_values(values: list[str]) -> str:
    return ",".join(values)


def utc_now_iso() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def parse_iso(value: str | None) -> datetime | None:
    if not value or not str(value).strip():
        return None
    text = str(value).strip().replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(text)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=UTC)
    return parsed


def generate_secret_key(nbytes: int = 64) -> str:
    return secrets.token_hex(nbytes)


def generate_fernet_key() -> str:
    from cryptography.fernet import Fernet

    return Fernet.generate_key().decode("ascii")


def push_fallback(primary: str, fallbacks: list[str], *, maximum: int = MAX_SECRET_FALLBACKS) -> list[str]:
    """Empurra a primary atual para o início dos fallbacks, sem duplicar, com teto."""

    next_fallbacks = [primary] + [item for item in fallbacks if item and item != primary]
    return next_fallbacks[:maximum]


@dataclass(frozen=True, slots=True)
class EnvFile:
    """Arquivo ``.env`` com leitura/escrita atômica de chaves."""

    path: Path

    @classmethod
    def resolve(cls, explicit: str | None = None) -> EnvFile:
        if explicit:
            return cls(Path(explicit))
        configured = os.environ.get("PDL_ENV_FILE", "").strip()
        if configured:
            return cls(Path(configured))
        # backend/common/secrets_env.py → repo root
        repo = Path(__file__).resolve().parents[2]
        candidate = repo / ".env"
        if candidate.is_file():
            return cls(candidate)
        backend_env = Path(__file__).resolve().parents[1] / ".env"
        return cls(backend_env if backend_env.is_file() else candidate)

    def read(self, key: str) -> str:
        if not self.path.is_file():
            return ""
        prefix = f"{key}="
        for line in self.path.read_text(encoding="utf-8").splitlines():
            if line.startswith(prefix):
                return line.split("=", 1)[1]
        return ""

    def write_many(self, updates: dict[str, str]) -> None:
        """Atualiza ou acrescenta chaves; grava de forma atômica."""

        self.path.parent.mkdir(parents=True, exist_ok=True)
        existing = self.path.read_text(encoding="utf-8") if self.path.is_file() else ""
        lines = existing.splitlines()
        seen: set[str] = set()
        out: list[str] = []
        for line in lines:
            if not line or line.lstrip().startswith("#") or "=" not in line:
                out.append(line)
                continue
            key, _ = line.split("=", 1)
            if key in updates:
                if key not in seen:
                    out.append(f"{key}={updates[key]}")
                    seen.add(key)
                continue
            out.append(line)
        for key, value in updates.items():
            if key not in seen:
                out.append(f"{key}={value}")
        payload = "\n".join(out)
        if payload and not payload.endswith("\n"):
            payload += "\n"
        fd, tmp_name = tempfile.mkstemp(prefix=f"{self.path.name}.", dir=str(self.path.parent))
        try:
            with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as handle:
                handle.write(payload)
            os.replace(tmp_name, self.path)
        except Exception:
            try:
                os.unlink(tmp_name)
            except OSError:
                pass
            raise
        try:
            os.chmod(self.path, 0o600)
        except OSError:
            pass
