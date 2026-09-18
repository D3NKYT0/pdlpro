"""Cifra simétrica em repouso para segredos persistidos pelo painel.

A porta ``IFieldCipher`` não depende de Django. O adaptador Fernet lê
``PDL_DATA_ENCRYPTION_KEY`` (URL-safe Base64 de 32 bytes). Produção recusa chave
ausente ou inválida; desenvolvimento pode derivar uma chave da ``SECRET_KEY`` só
para o ambiente local. Rotacionar a chave sem regravar os valores cifrados
invalida TOTP, códigos de recuperação e pacotes LGPD já persistidos.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import re
from abc import ABC, abstractmethod

from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

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
        """HMAC-SHA256 em hex, amarrado à chave de cifra."""

        raise NotImplementedError


class FernetFieldCipher(IFieldCipher):
    """Adaptador Fernet de ``IFieldCipher``."""

    def __init__(self, key: str) -> None:
        material = (key or "").strip().encode("ascii")
        try:
            self._fernet = Fernet(material)
        except (ValueError, TypeError) as exc:
            raise ImproperlyConfigured("PDL_DATA_ENCRYPTION_KEY não é uma chave Fernet válida.") from exc
        self._hmac_key = hashlib.sha256(b"pdl-hmac|" + material).digest()

    def seal_text(self, plaintext: str) -> str:
        if not plaintext:
            return ""
        return self._fernet.encrypt(plaintext.encode("utf-8")).decode("ascii")

    def unseal_text(self, stored: str) -> str:
        value = stored or ""
        if not value:
            return ""
        try:
            return self._fernet.decrypt(value.encode("ascii")).decode("utf-8")
        except (InvalidToken, ValueError, TypeError):
            if LEGACY_TOTP_RE.fullmatch(value):
                return value
            return ""

    def seal_bytes(self, data: bytes) -> bytes:
        return self._fernet.encrypt(data)

    def unseal_bytes(self, stored: bytes) -> bytes:
        if not stored:
            return b""
        if stored.startswith(GZIP_MAGIC):
            return stored
        try:
            return self._fernet.decrypt(stored)
        except InvalidToken as exc:
            raise ValueError("conteúdo cifrado inválido ou chave de dados incorreta") from exc

    def hmac_hex(self, message: str) -> str:
        return hmac.new(self._hmac_key, message.encode("utf-8"), hashlib.sha256).hexdigest()


def derive_development_fernet_key(secret_key: str) -> str:
    """Deriva uma chave Fernet da SECRET_KEY. Só use em DEBUG local, nunca em produção."""

    digest = hashlib.sha256(f"pdl-data-enc|{secret_key}".encode()).digest()
    return base64.urlsafe_b64encode(digest).decode("ascii")


def resolve_data_encryption_key() -> str:
    """Lê ``PDL_DATA_ENCRYPTION_KEY`` ou deriva no desenvolvimento."""

    configured = str(getattr(settings, "PDL_DATA_ENCRYPTION_KEY", "") or "").strip()
    if configured:
        return configured
    if getattr(settings, "DEBUG", False) and not getattr(settings, "TESTING", False):
        return derive_development_fernet_key(str(settings.SECRET_KEY))
    raise ImproperlyConfigured(
        "PDL_DATA_ENCRYPTION_KEY é obrigatória neste ambiente. "
        "Gere uma chave Fernet com './setup.sh configure-production'."
    )


def field_cipher_from_settings() -> FernetFieldCipher:
    """Constrói o adaptador a partir dos settings Django atuais."""

    return FernetFieldCipher(resolve_data_encryption_key())
