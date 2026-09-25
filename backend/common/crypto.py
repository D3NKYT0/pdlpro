"""Cifra simétrica em repouso para segredos persistidos pelo painel.

A porta ``IFieldCipher`` não depende de Django. O adaptador usa ``MultiFernet``:
a chave primaria (``PDL_DATA_ENCRYPTION_KEY``) sela novos valores; as chaves em
``PDL_DATA_ENCRYPTION_KEY_FALLBACKS`` ainda abrem o legado. O HMAC dos códigos de
recuperação usa ``PDL_DATA_HMAC_KEY`` (estável; não acompanha a rotação Fernet).
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import re
from abc import ABC, abstractmethod

from cryptography.fernet import Fernet, InvalidToken, MultiFernet
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

from common.secrets_env import parse_csv_values

GZIP_MAGIC = b"\x1f\x8b"
LEGACY_TOTP_RE = re.compile(r"^[A-Z2-7]{16,32}$")


class IFieldCipher(ABC):
    """Porta de selar/abrir texto e bytes e de HMAC autenticado da mesma chave."""

    @abstractmethod
    def seal_text(self, plaintext: str) -> str:
        """Devolve o texto cifrado, ou vazio quando a entrada é vazia."""

        raise NotImplementedError

    @abstractmethod
    def unseal_text(self, stored: str) -> str:
        """Abre o texto cifrado; aceita TOTP legado em claro."""

        raise NotImplementedError

    @abstractmethod
    def seal_bytes(self, data: bytes) -> bytes:
        raise NotImplementedError

    @abstractmethod
    def unseal_bytes(self, stored: bytes) -> bytes:
        """Abre bytes cifrados; devolve gzip legado sem alteração."""

        raise NotImplementedError

    @abstractmethod
    def hmac_hex(self, message: str) -> str:
        """HMAC-SHA256 em hex, amarrado à chave HMAC estável."""

        raise NotImplementedError

    def needs_reseal_text(self, stored: str) -> bool:
        """Indica se o valor ainda não está selado com a chave primaria."""

        return False

    def needs_reseal_bytes(self, stored: bytes) -> bool:
        return False


class FernetFieldCipher(IFieldCipher):
    """Adaptador MultiFernet de ``IFieldCipher``."""

    def __init__(self, primary: str, fallbacks: list[str] | None = None, *, hmac_key: str | None = None) -> None:
        keys = [primary.strip()] + [item.strip() for item in (fallbacks or []) if item and item.strip()]
        fernets: list[Fernet] = []
        for raw in keys:
            try:
                fernets.append(Fernet(raw.encode("ascii")))
            except (ValueError, TypeError) as exc:
                raise ImproperlyConfigured(
                    "PDL_DATA_ENCRYPTION_KEY (ou fallback) não é uma chave Fernet válida."
                ) from exc
        if not fernets:
            raise ImproperlyConfigured("PDL_DATA_ENCRYPTION_KEY é obrigatória.")
        self._primary_material = keys[0].encode("ascii")
        self._multi = MultiFernet(fernets)
        self._primary = fernets[0]
        hmac_material = (hmac_key or "").strip().encode("utf-8") or (b"pdl-hmac|" + self._primary_material)
        self._hmac_key = hashlib.sha256(hmac_material).digest()

    def seal_text(self, plaintext: str) -> str:
        if not plaintext:
            return ""
        return self._multi.encrypt(plaintext.encode("utf-8")).decode("ascii")

    def unseal_text(self, stored: str) -> str:
        value = stored or ""
        if not value:
            return ""
        try:
            return self._multi.decrypt(value.encode("ascii")).decode("utf-8")
        except (InvalidToken, ValueError, TypeError):
            if LEGACY_TOTP_RE.fullmatch(value):
                return value
            return ""

    def seal_bytes(self, data: bytes) -> bytes:
        return self._multi.encrypt(data)

    def unseal_bytes(self, stored: bytes) -> bytes:
        if not stored:
            return b""
        if stored.startswith(GZIP_MAGIC):
            return stored
        try:
            return self._multi.decrypt(stored)
        except InvalidToken as exc:
            raise ValueError("conteúdo cifrado inválido ou chave de dados incorreta") from exc

    def hmac_hex(self, message: str) -> str:
        return hmac.new(self._hmac_key, message.encode("utf-8"), hashlib.sha256).hexdigest()

    def needs_reseal_text(self, stored: str) -> bool:
        value = stored or ""
        if not value or LEGACY_TOTP_RE.fullmatch(value):
            return bool(value)
        try:
            plain = self._multi.decrypt(value.encode("ascii"))
        except (InvalidToken, ValueError, TypeError):
            return False
        try:
            self._primary.decrypt(value.encode("ascii"))
            return False
        except InvalidToken:
            return bool(plain)

    def needs_reseal_bytes(self, stored: bytes) -> bool:
        if not stored or stored.startswith(GZIP_MAGIC):
            return bool(stored) and stored.startswith(GZIP_MAGIC)
        try:
            plain = self._multi.decrypt(stored)
        except InvalidToken:
            return False
        try:
            self._primary.decrypt(stored)
            return False
        except InvalidToken:
            return bool(plain)


def derive_development_fernet_key(secret_key: str) -> str:
    """Deriva uma chave Fernet da SECRET_KEY. Só use em DEBUG local, nunca em produção."""

    digest = hashlib.sha256(f"pdl-data-enc|{secret_key}".encode()).digest()
    return base64.urlsafe_b64encode(digest).decode("ascii")


def resolve_data_encryption_keys() -> tuple[str, list[str]]:
    """Devolve (primaria, fallbacks) a partir dos settings."""

    configured = str(getattr(settings, "PDL_DATA_ENCRYPTION_KEY", "") or "").strip()
    fallbacks = list(getattr(settings, "PDL_DATA_ENCRYPTION_KEY_FALLBACKS", None) or [])
    if isinstance(fallbacks, str):
        fallbacks = parse_csv_values(fallbacks)
    if configured:
        return configured, [item for item in fallbacks if item and item != configured]
    if getattr(settings, "DEBUG", False) and not getattr(settings, "TESTING", False):
        return derive_development_fernet_key(str(settings.SECRET_KEY)), []
    raise ImproperlyConfigured(
        "PDL_DATA_ENCRYPTION_KEY é obrigatória neste ambiente. "
        "Gere uma chave Fernet com './setup.sh configure-production'."
    )


def resolve_data_encryption_key() -> str:
    """Lê a primaria ``PDL_DATA_ENCRYPTION_KEY`` ou deriva no desenvolvimento."""

    primary, _ = resolve_data_encryption_keys()
    return primary


def resolve_data_hmac_key() -> str | None:
    """HMAC estável; vazio faz o adaptador derivar da primaria (compatibilidade)."""

    value = str(getattr(settings, "PDL_DATA_HMAC_KEY", "") or "").strip()
    return value or None


def field_cipher_from_settings() -> FernetFieldCipher:
    """Constrói o adaptador MultiFernet a partir dos settings Django atuais."""

    primary, fallbacks = resolve_data_encryption_keys()
    return FernetFieldCipher(primary, fallbacks, hmac_key=resolve_data_hmac_key())
