"""Portas e catálogo de campos do configurador de integrações."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any

CLEAR_SENTINEL = "__CLEAR__"

SECTION_PAYMENTS = "payments"
SECTION_LINEAGE = "lineage"
SECTION_SMTP = "smtp"
SECTION_OAUTH = "oauth"
SECTION_DENKYNHO = "denkynho"
SECTION_STORAGE = "storage"
SECTION_OBSERVABILITY = "observability"
SECTIONS = (
    SECTION_PAYMENTS,
    SECTION_LINEAGE,
    SECTION_SMTP,
    SECTION_OAUTH,
    SECTION_DENKYNHO,
    SECTION_STORAGE,
    SECTION_OBSERVABILITY,
)

# Campos sensíveis: nunca saem em claro na API.
SECRET_KEYS: frozenset[str] = frozenset(
    {
        "STRIPE_SECRET_KEY",
        "STRIPE_WEBHOOK_SECRET",
        "MERCADO_PAGO_ACCESS_TOKEN",
        "MERCADO_PAGO_WEBHOOK_SECRET",
        "LINEAGE_DB_PASSWORD",
        "LINEAGE_DB_SSL_KEY",
        "EMAIL_HOST_PASSWORD",
        "VAPID_PRIVATE_KEY",
        "GOOGLE_CLIENT_SECRET",
        "DISCORD_CLIENT_SECRET",
        "HCAPTCHA_SECRET_KEY",
        "DENKYNHO_LLM_API_KEY",
        "AWS_SECRET_ACCESS_KEY",
        "SENTRY_DSN",
    }
)

# Chaves mascaradas parcialmente na API (prefixo público).
MASKED_PUBLIC_KEYS: frozenset[str] = frozenset(
    {
        "STRIPE_PUBLISHABLE_KEY",
        "MERCADO_PAGO_PUBLIC_KEY",
        "VAPID_PUBLIC_KEY",
        "GOOGLE_CLIENT_ID",
        "DISCORD_CLIENT_ID",
        "HCAPTCHA_SITE_KEY",
        "AWS_ACCESS_KEY_ID",
    }
)

SECTION_KEYS: dict[str, tuple[str, ...]] = {
    SECTION_PAYMENTS: (
        "STRIPE_SECRET_KEY",
        "STRIPE_PUBLISHABLE_KEY",
        "STRIPE_WEBHOOK_SECRET",
        "STRIPE_ACTIVATE_PAYMENTS",
        "MERCADO_PAGO_ACCESS_TOKEN",
        "MERCADO_PAGO_PUBLIC_KEY",
        "MERCADO_PAGO_WEBHOOK_SECRET",
        "MERCADO_PAGO_ACTIVATE_PAYMENTS",
        "PAYMENT_METHODS",
        "PAYMENT_WEBHOOK_BASE_URL",
        "COINS_PER_USD",
        "PAYMENT_ALLOW_MOCK",
        "PAYMENT_REUSE_HOURS",
    ),
    SECTION_LINEAGE: (
        "LINEAGE_DB_ENABLED",
        "LINEAGE_DB_HOST",
        "LINEAGE_DB_PORT",
        "LINEAGE_DB_NAME",
        "LINEAGE_DB_USER",
        "LINEAGE_DB_PASSWORD",
        "LINEAGE_DB_SSL",
        "LINEAGE_DB_SSL_VERIFY",
        "LINEAGE_DB_SSL_CA",
        "LINEAGE_DB_SSL_CERT",
        "LINEAGE_DB_SSL_KEY",
        "LINEAGE_QUERY_MODULE",
        "LINEAGE_PASSWORD_ALGO",
        "LINEAGE_DB_POOL_SIZE",
        "LINEAGE_DB_MAX_OVERFLOW",
        "GAME_SERVER_IP",
        "GAME_SERVER_PORT",
        "LOGIN_SERVER_PORT",
        "SERVER_STATUS_TIMEOUT",
        "FAKE_PLAYERS_FACTOR",
        "FAKE_PLAYERS_MIN",
        "FAKE_PLAYERS_MAX",
    ),
    SECTION_SMTP: (
        "EMAIL_BACKEND",
        "EMAIL_HOST",
        "EMAIL_PORT",
        "EMAIL_USE_TLS",
        "EMAIL_USE_SSL",
        "EMAIL_HOST_USER",
        "EMAIL_HOST_PASSWORD",
        "DEFAULT_FROM_EMAIL",
        "VAPID_PUBLIC_KEY",
        "VAPID_PRIVATE_KEY",
        "VAPID_SUBJECT",
    ),
    SECTION_OAUTH: (
        "GOOGLE_CLIENT_ID",
        "GOOGLE_CLIENT_SECRET",
        "DISCORD_CLIENT_ID",
        "DISCORD_CLIENT_SECRET",
        "HCAPTCHA_SITE_KEY",
        "HCAPTCHA_SECRET_KEY",
        "WEBAUTHN_RP_ID",
        "WEBAUTHN_RP_NAME",
        "WEBAUTHN_ORIGINS",
    ),
    SECTION_DENKYNHO: (
        "DENKYNHO_LLM_ENABLED",
        "DENKYNHO_LLM_PROVIDER",
        "DENKYNHO_OLLAMA_URL",
        "DENKYNHO_OLLAMA_DOCKER",
        "DENKYNHO_LLM_MODEL",
        "DENKYNHO_LLM_TIMEOUT",
        "DENKYNHO_LLM_API_URL",
        "DENKYNHO_LLM_API_KEY",
        "DENKYNHO_EMBEDDINGS_ENABLED",
        "DENKYNHO_EMBEDDING_MODEL",
    ),
    SECTION_STORAGE: (
        "USE_S3",
        "AWS_ACCESS_KEY_ID",
        "AWS_SECRET_ACCESS_KEY",
        "AWS_STORAGE_BUCKET_NAME",
        "AWS_S3_REGION_NAME",
        "AWS_S3_ENDPOINT_URL",
        "AWS_S3_CUSTOM_DOMAIN",
        "AWS_S3_PRIVATE_MEDIA",
        "AWS_QUERYSTRING_EXPIRE",
        "AWS_LOCATION",
    ),
    SECTION_OBSERVABILITY: (
        "SENTRY_DSN",
        "SENTRY_ENVIRONMENT",
        "SENTRY_RELEASE",
        "SENTRY_TRACES_SAMPLE_RATE",
    ),
}

BOOL_KEYS = frozenset(
    {
        "STRIPE_ACTIVATE_PAYMENTS",
        "MERCADO_PAGO_ACTIVATE_PAYMENTS",
        "LINEAGE_DB_ENABLED",
        "LINEAGE_DB_SSL",
        "LINEAGE_DB_SSL_VERIFY",
        "EMAIL_USE_TLS",
        "EMAIL_USE_SSL",
        "PAYMENT_ALLOW_MOCK",
        "DENKYNHO_LLM_ENABLED",
        "DENKYNHO_OLLAMA_DOCKER",
        "DENKYNHO_EMBEDDINGS_ENABLED",
        "USE_S3",
        "AWS_S3_PRIVATE_MEDIA",
    }
)

INT_KEYS = frozenset(
    {
        "LINEAGE_DB_PORT",
        "LINEAGE_DB_POOL_SIZE",
        "LINEAGE_DB_MAX_OVERFLOW",
        "GAME_SERVER_PORT",
        "LOGIN_SERVER_PORT",
        "EMAIL_PORT",
        "PAYMENT_REUSE_HOURS",
        "FAKE_PLAYERS_MIN",
        "FAKE_PLAYERS_MAX",
        "AWS_QUERYSTRING_EXPIRE",
    }
)

FLOAT_KEYS = frozenset(
    {
        "SERVER_STATUS_TIMEOUT",
        "FAKE_PLAYERS_FACTOR",
        "DENKYNHO_LLM_TIMEOUT",
        "SENTRY_TRACES_SAMPLE_RATE",
    }
)

LIST_KEYS = frozenset(
    {
        "PAYMENT_METHODS",
        "WEBAUTHN_ORIGINS",
    }
)


@dataclass(frozen=True)
class FieldStatus:
    key: str
    configured: bool
    fingerprint: str = ""
    value: Any = None  # só campos não-secretos
    masked: str = ""  # preview mascarado para chaves públicas


@dataclass(frozen=True)
class SectionStatus:
    section: str
    fields: list[FieldStatus] = field(default_factory=list)
    updated_at: str | None = None


@dataclass(frozen=True)
class IntegrationsStatus:
    payments: SectionStatus
    lineage: SectionStatus
    smtp: SectionStatus
    oauth: SectionStatus
    denkynho: SectionStatus
    storage: SectionStatus
    observability: SectionStatus
    revision: int = 0


@dataclass(frozen=True)
class ProbeResult:
    ok: bool
    message: str
    details: dict[str, Any] = field(default_factory=dict)


class IIntegrationConfigStore(ABC):
    """Persiste seções cifradas de configuração de integração."""

    @abstractmethod
    def load_section(self, section: str) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def save_section(self, section: str, data: dict[str, Any], *, actor_id: Any = None) -> None:
        raise NotImplementedError

    @abstractmethod
    def section_updated_at(self, section: str) -> str | None:
        raise NotImplementedError


class IRuntimeSettingsApplier(ABC):
    """Aplica overlay no processo e sinaliza outros workers."""

    @abstractmethod
    def apply_all(self) -> int:
        """Carrega todas as seções do store, aplica em settings e retorna a revisão."""

        raise NotImplementedError

    @abstractmethod
    def apply_section(self, section: str) -> int:
        raise NotImplementedError

    @abstractmethod
    def current_revision(self) -> int:
        raise NotImplementedError

    @abstractmethod
    def refresh_if_stale(self) -> bool:
        """Reaplica se a revisão em cache mudou. True se houve reload."""

        raise NotImplementedError


class IIntegrationProbe(ABC):
    @abstractmethod
    def test_payments(self) -> ProbeResult:
        raise NotImplementedError

    @abstractmethod
    def test_lineage(self) -> ProbeResult:
        raise NotImplementedError

    @abstractmethod
    def test_smtp(self, *, to_email: str) -> ProbeResult:
        raise NotImplementedError

    @abstractmethod
    def test_oauth(self) -> ProbeResult:
        raise NotImplementedError

    @abstractmethod
    def test_denkynho(self) -> ProbeResult:
        raise NotImplementedError

    @abstractmethod
    def test_storage(self) -> ProbeResult:
        raise NotImplementedError

    @abstractmethod
    def test_observability(self) -> ProbeResult:
        raise NotImplementedError
