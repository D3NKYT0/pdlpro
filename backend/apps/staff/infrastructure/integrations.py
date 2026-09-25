"""Adaptadores: store cifrado, overlay de settings e probes de integração."""

from __future__ import annotations

import json
import socket
from typing import Any
from urllib.parse import urlparse

from django.conf import settings
from django.core.cache import cache
from django.core.mail import send_mail
from django.db import connection
from django.utils import timezone
from django.utils.translation import gettext as _

from apps.staff.domain.integrations import (
    BOOL_KEYS,
    FLOAT_KEYS,
    INT_KEYS,
    SECTION_DENKYNHO,
    SECTION_KEYS,
    SECTION_LINEAGE,
    SECTION_OAUTH,
    SECTION_OBSERVABILITY,
    SECTION_PAYMENTS,
    SECTION_SMTP,
    SECTION_STORAGE,
    SECTIONS,
    IIntegrationConfigStore,
    IIntegrationProbe,
    IRuntimeSettingsApplier,
    ProbeResult,
)
from apps.staff.infrastructure.models import IntegrationSettings
from common.crypto import IFieldCipher, field_cipher_from_settings
from common.storage_config import apply_media_storage

REV_CACHE_KEY = "pdl:integrations:rev"
BLOB_ATTR = {
    SECTION_PAYMENTS: "payments_blob",
    SECTION_LINEAGE: "lineage_blob",
    SECTION_SMTP: "smtp_blob",
    SECTION_OAUTH: "oauth_blob",
    SECTION_DENKYNHO: "denkynho_blob",
    SECTION_STORAGE: "storage_blob",
    SECTION_OBSERVABILITY: "observability_blob",
}

_local_rev: int = 0
_boot_defaults: dict[str, Any] | None = None
_process_bootstrapped: bool = False


def _ensure_boot_defaults() -> dict[str, Any]:
    global _boot_defaults
    if _boot_defaults is None:
        captured: dict[str, Any] = {}
        for section in SECTIONS:
            for key in SECTION_KEYS[section]:
                captured[key] = getattr(settings, key, None)
        _boot_defaults = captured
    return _boot_defaults


def _singleton() -> IntegrationSettings:
    row, _ = IntegrationSettings.objects.get_or_create(pk=1)
    return row


class DjangoIntegrationConfigStore(IIntegrationConfigStore):
    """Persiste JSON por seção selado com Fernet."""

    def __init__(self, cipher: IFieldCipher | None = None) -> None:
        self._cipher = cipher or field_cipher_from_settings()

    def load_section(self, section: str) -> dict[str, Any]:
        attr = BLOB_ATTR[section]
        raw = getattr(_singleton(), attr) or ""
        if not raw.strip():
            return {}
        try:
            payload = self._cipher.unseal_text(raw)
            data = json.loads(payload)
        except Exception:  # noqa: BLE001
            return {}
        if not isinstance(data, dict):
            return {}
        allowed = set(SECTION_KEYS[section])
        return {key: data[key] for key in data if key in allowed}

    def save_section(self, section: str, data: dict[str, Any], *, actor_id: Any = None) -> None:
        allowed = set(SECTION_KEYS[section])
        cleaned = {key: data[key] for key in data if key in allowed}
        sealed = self._cipher.seal_text(json.dumps(cleaned, ensure_ascii=False, separators=(",", ":")))
        row = _singleton()
        setattr(row, BLOB_ATTR[section], sealed)
        update_fields = [BLOB_ATTR[section], "updated_at"]
        if actor_id:
            from apps.accounts.infrastructure.models import User

            actor = User.objects.filter(id=actor_id).first()
            if actor is not None:
                row.updated_by = actor
                update_fields.append("updated_by")
        row.save(update_fields=update_fields)

    def section_updated_at(self, section: str) -> str | None:
        row = _singleton()
        blob = getattr(row, BLOB_ATTR[section]) or ""
        if not blob.strip() or not row.updated_at:
            return None
        return row.updated_at.isoformat()


def _cast_for_settings(key: str, value: Any) -> Any:
    if key in BOOL_KEYS:
        return bool(value)
    if key in INT_KEYS:
        return int(value)
    if key in FLOAT_KEYS:
        return float(value)
    return value


def _reset_lineage_engine() -> None:
    try:
        from apps.server.domain.gateways import ILineageGateway
        from common.di.bootstrap import DependencyInjection

        gateway = DependencyInjection.root().resolve(ILineageGateway)
        reset = getattr(gateway, "reset_engine", None)
        if callable(reset):
            reset()
    except Exception:  # noqa: BLE001, S110
        pass


def _reconfigure_sentry() -> None:
    try:
        from core.settings.monitoring import configure_error_monitoring

        configure_error_monitoring(dsn=str(getattr(settings, "SENTRY_DSN", "") or ""))
    except Exception:  # noqa: BLE001, S110
        pass


class DjangoRuntimeSettingsApplier(IRuntimeSettingsApplier):
    """Aplica overlay do store em django.conf.settings e publica revisão no cache."""

    def __init__(self, store: IIntegrationConfigStore | None = None) -> None:
        self._store = store or DjangoIntegrationConfigStore()

    def _bump(self) -> int:
        try:
            rev = int(cache.get(REV_CACHE_KEY) or 0) + 1
        except Exception:  # noqa: BLE001
            rev = int(timezone.now().timestamp())
        try:
            cache.set(REV_CACHE_KEY, rev, timeout=None)
        except Exception:  # noqa: BLE001, S110
            pass
        global _local_rev
        _local_rev = rev
        return rev

    def current_revision(self) -> int:
        try:
            return int(cache.get(REV_CACHE_KEY) or _local_rev or 0)
        except Exception:  # noqa: BLE001
            return _local_rev

    def _apply_payload(self, section: str, data: dict[str, Any]) -> None:
        defaults = _ensure_boot_defaults()
        for key in SECTION_KEYS[section]:
            if key in data:
                setattr(settings, key, _cast_for_settings(key, data[key]))
            elif key in defaults:
                setattr(settings, key, defaults[key])
        if section == SECTION_LINEAGE:
            _reset_lineage_engine()
        if section == SECTION_OAUTH:
            site = str(getattr(settings, "HCAPTCHA_SITE_KEY", "") or "").strip()
            secret = str(getattr(settings, "HCAPTCHA_SECRET_KEY", "") or "").strip()
            settings.HCAPTCHA_ENABLED = bool(site and secret)
        if section == SECTION_STORAGE:
            apply_media_storage(settings)
        if section == SECTION_OBSERVABILITY:
            _reconfigure_sentry()

    def apply_section(self, section: str) -> int:
        data = self._store.load_section(section)
        self._apply_payload(section, data)
        return self._bump()

    def apply_all(self) -> int:
        _ensure_boot_defaults()
        for section in SECTIONS:
            data = self._store.load_section(section)
            self._apply_payload(section, data)
        return self._bump()

    def refresh_if_stale(self) -> bool:
        global _local_rev, _process_bootstrapped
        if not _process_bootstrapped:
            _process_bootstrapped = True
            try:
                _ensure_boot_defaults()
                for section in SECTIONS:
                    self._apply_payload(section, self._store.load_section(section))
                _local_rev = self.current_revision()
                return True
            except Exception:  # noqa: BLE001
                return False
        remote = self.current_revision()
        if remote == _local_rev:
            return False
        _ensure_boot_defaults()
        for section in SECTIONS:
            self._apply_payload(section, self._store.load_section(section))
        _local_rev = remote
        return True


class DjangoIntegrationProbe(IIntegrationProbe):
    """Testes operacionais sem expor segredos."""

    def test_payments(self) -> ProbeResult:
        stripe_ok = bool(getattr(settings, "STRIPE_SECRET_KEY", "") or "")
        stripe_on = bool(getattr(settings, "STRIPE_ACTIVATE_PAYMENTS", False))
        mp_ok = bool(getattr(settings, "MERCADO_PAGO_ACCESS_TOKEN", "") or "")
        mp_on = bool(getattr(settings, "MERCADO_PAGO_ACTIVATE_PAYMENTS", False))
        methods = [str(m).lower() for m in (getattr(settings, "PAYMENT_METHODS", []) or [])]
        details = {
            "stripe_configured": stripe_ok,
            "stripe_active": stripe_on,
            "mercado_pago_configured": mp_ok,
            "mercado_pago_active": mp_on,
            "payment_methods": methods,
            "webhook_base": bool(str(getattr(settings, "PAYMENT_WEBHOOK_BASE_URL", "") or "").strip()),
            "coins_per_usd": str(getattr(settings, "COINS_PER_USD", "") or ""),
        }
        if not stripe_ok and not mp_ok and "mock" not in methods:
            return ProbeResult(False, _("Nenhum provedor de pagamento configurado."), details)
        if stripe_on and not stripe_ok:
            return ProbeResult(False, _("Stripe ativo sem chave secreta."), details)
        if mp_on and not mp_ok:
            return ProbeResult(False, _("Mercado Pago ativo sem access token."), details)
        if "stripe" in methods and not stripe_ok:
            return ProbeResult(False, _("PAYMENT_METHODS inclui stripe sem chave secreta."), details)
        if "mercadopago" in methods and not mp_ok:
            return ProbeResult(False, _("PAYMENT_METHODS inclui mercadopago sem access token."), details)
        return ProbeResult(True, _("Credenciais de pagamento presentes e consistentes."), details)

    def test_lineage(self) -> ProbeResult:
        details: dict[str, Any] = {}
        enabled = bool(getattr(settings, "LINEAGE_DB_ENABLED", False))
        details["db_enabled"] = enabled
        host = str(getattr(settings, "GAME_SERVER_IP", "") or "")
        gs_port = int(getattr(settings, "GAME_SERVER_PORT", 0) or 0)
        login_port = int(getattr(settings, "LOGIN_SERVER_PORT", 0) or 0)
        timeout = float(getattr(settings, "SERVER_STATUS_TIMEOUT", 2) or 2)
        details["game_host"] = host
        details["game_port_open"] = _tcp_open(host, gs_port, timeout) if host and gs_port else False
        details["login_port_open"] = _tcp_open(host, login_port, timeout) if host and login_port else False
        details["fake_players_factor"] = float(getattr(settings, "FAKE_PLAYERS_FACTOR", 1) or 1)

        if enabled:
            try:
                from sqlalchemy import create_engine, text

                from apps.server.infrastructure.lineage_ssl import (
                    lineage_connect_args_from_settings,
                )

                user = settings.LINEAGE_DB_USER
                password = settings.LINEAGE_DB_PASSWORD
                db_host = settings.LINEAGE_DB_HOST
                port = settings.LINEAGE_DB_PORT
                name = settings.LINEAGE_DB_NAME
                url = f"mysql+pymysql://{user}:{password}@{db_host}:{port}/{name}?charset=utf8mb4"
                engine = create_engine(
                    url,
                    pool_pre_ping=True,
                    connect_args=lineage_connect_args_from_settings(settings),
                )
                with engine.connect() as conn:
                    conn.execute(text("SELECT 1"))
                engine.dispose()
                details["db_ok"] = True
            except Exception as exc:  # noqa: BLE001
                details["db_ok"] = False
                details["db_error"] = type(exc).__name__
                return ProbeResult(False, _("Falha ao conectar no MySQL do Lineage."), details)
        else:
            details["db_ok"] = None

        if (
            not details.get("game_port_open")
            and not details.get("login_port_open")
            and not details.get("db_ok")
        ):
            return ProbeResult(
                False,
                _("Nenhum endpoint do jogo respondeu e o banco não está habilitado/ok."),
                details,
            )
        return ProbeResult(True, _("Probe Lineage/game concluído."), details)

    def test_smtp(self, *, to_email: str) -> ProbeResult:
        host = str(getattr(settings, "EMAIL_HOST", "") or "").strip()
        backend = str(getattr(settings, "EMAIL_BACKEND", "") or "")
        vapid_pub = str(getattr(settings, "VAPID_PUBLIC_KEY", "") or "").strip()
        vapid_priv = str(getattr(settings, "VAPID_PRIVATE_KEY", "") or "").strip()
        details: dict[str, Any] = {
            "host": host or None,
            "backend": backend,
            "vapid_configured": bool(vapid_pub and vapid_priv),
        }
        if bool(vapid_pub) != bool(vapid_priv):
            return ProbeResult(
                False,
                _("VAPID incompleto: informe chave pública e privada."),
                details,
            )
        try:
            sent = send_mail(
                subject=_("PDL PRO — teste SMTP"),
                message=_("Este é um e-mail de teste do configurador de integrações."),
                from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None),
                recipient_list=[to_email],
                fail_silently=False,
            )
            details["sent"] = int(sent)
            return ProbeResult(True, _("E-mail de teste enviado."), details)
        except Exception as exc:  # noqa: BLE001
            details["error"] = type(exc).__name__
            return ProbeResult(False, _("Falha ao enviar e-mail de teste."), details)

    def test_oauth(self) -> ProbeResult:
        google_id = str(getattr(settings, "GOOGLE_CLIENT_ID", "") or "").strip()
        google_secret = str(getattr(settings, "GOOGLE_CLIENT_SECRET", "") or "").strip()
        discord_id = str(getattr(settings, "DISCORD_CLIENT_ID", "") or "").strip()
        discord_secret = str(getattr(settings, "DISCORD_CLIENT_SECRET", "") or "").strip()
        site = str(getattr(settings, "HCAPTCHA_SITE_KEY", "") or "").strip()
        hcaptcha_secret = str(getattr(settings, "HCAPTCHA_SECRET_KEY", "") or "").strip()
        rp_id = str(getattr(settings, "WEBAUTHN_RP_ID", "") or "").strip()
        origins = list(getattr(settings, "WEBAUTHN_ORIGINS", []) or [])
        details = {
            "google_configured": bool(google_id and google_secret),
            "discord_configured": bool(discord_id and discord_secret),
            "hcaptcha_configured": bool(site and hcaptcha_secret),
            "hcaptcha_enabled": bool(getattr(settings, "HCAPTCHA_ENABLED", False)),
            "webauthn_rp_id": rp_id or None,
            "webauthn_origins": len(origins),
        }
        if bool(google_id) != bool(google_secret):
            return ProbeResult(False, _("Google OAuth incompleto: informe client id e secret."), details)
        if bool(discord_id) != bool(discord_secret):
            return ProbeResult(False, _("Discord OAuth incompleto: informe client id e secret."), details)
        if bool(site) != bool(hcaptcha_secret):
            return ProbeResult(False, _("hCaptcha incompleto: informe site key e secret."), details)
        if rp_id and not origins:
            return ProbeResult(False, _("WebAuthn: informe WEBAUTHN_ORIGINS quando RP ID estiver definido."), details)
        if not details["google_configured"] and not details["discord_configured"] and not details["hcaptcha_configured"] and not rp_id:
            return ProbeResult(False, _("Nenhum provedor OAuth/hCaptcha/WebAuthn configurado."), details)
        return ProbeResult(True, _("Credenciais OAuth/hCaptcha/WebAuthn consistentes."), details)

    def test_denkynho(self) -> ProbeResult:
        enabled = bool(getattr(settings, "DENKYNHO_LLM_ENABLED", False))
        provider = str(getattr(settings, "DENKYNHO_LLM_PROVIDER", "ollama") or "ollama").strip().lower()
        api_url = str(getattr(settings, "DENKYNHO_LLM_API_URL", "") or "").strip()
        api_key = str(getattr(settings, "DENKYNHO_LLM_API_KEY", "") or "").strip()
        ollama_url = str(getattr(settings, "DENKYNHO_OLLAMA_URL", "") or "").strip()
        details: dict[str, Any] = {
            "enabled": enabled,
            "provider": provider,
            "model": str(getattr(settings, "DENKYNHO_LLM_MODEL", "") or ""),
            "embeddings": bool(getattr(settings, "DENKYNHO_EMBEDDINGS_ENABLED", False)),
        }
        if not enabled:
            return ProbeResult(True, _("Denkynho LLM desligado (somente FAQ)."), details)
        if provider == "remote":
            if not api_url:
                return ProbeResult(False, _("Modo remote exige DENKYNHO_LLM_API_URL."), details)
            details["api_url_host"] = urlparse(api_url).hostname
            details["api_key_configured"] = bool(api_key)
            return ProbeResult(True, _("Configuração remota do Denkynho consistente."), details)
        if not ollama_url:
            return ProbeResult(False, _("Modo ollama exige DENKYNHO_OLLAMA_URL."), details)
        parsed = urlparse(ollama_url)
        host = parsed.hostname or ""
        port = parsed.port or (443 if parsed.scheme == "https" else 80)
        details["ollama_host"] = host
        details["ollama_reachable"] = _tcp_open(host, port, 2.0) if host else False
        if not details["ollama_reachable"]:
            return ProbeResult(False, _("Ollama não respondeu em DENKYNHO_OLLAMA_URL."), details)
        return ProbeResult(True, _("Ollama alcançável."), details)

    def test_storage(self) -> ProbeResult:
        use_s3 = bool(getattr(settings, "USE_S3", False))
        details: dict[str, Any] = {
            "enabled": use_s3,
            "backend": "s3" if use_s3 else "local",
            "bucket": str(getattr(settings, "AWS_STORAGE_BUCKET_NAME", "") or "") or None,
            "endpoint": str(getattr(settings, "AWS_S3_ENDPOINT_URL", "") or "") or None,
            "custom_domain": str(getattr(settings, "AWS_S3_CUSTOM_DOMAIN", "") or "") or None,
        }
        if not use_s3:
            return ProbeResult(True, _("Armazenamento local (filesystem)."), details)
        access = str(getattr(settings, "AWS_ACCESS_KEY_ID", "") or "").strip()
        secret = str(getattr(settings, "AWS_SECRET_ACCESS_KEY", "") or "").strip()
        bucket = str(getattr(settings, "AWS_STORAGE_BUCKET_NAME", "") or "").strip()
        if not access or not secret or not bucket:
            return ProbeResult(False, _("S3/R2 incompleto: access key, secret e bucket são obrigatórios."), details)
        try:
            import boto3
            from botocore.config import Config as BotoConfig

            client_kwargs: dict[str, Any] = {
                "service_name": "s3",
                "aws_access_key_id": access,
                "aws_secret_access_key": secret,
                "region_name": str(getattr(settings, "AWS_S3_REGION_NAME", "auto") or "auto"),
            }
            endpoint_url = str(getattr(settings, "AWS_S3_ENDPOINT_URL", "") or "").strip()
            if endpoint_url:
                client_kwargs["endpoint_url"] = endpoint_url
            client_config = getattr(settings, "AWS_S3_CLIENT_CONFIG", None)
            if client_config is None:
                client_config = BotoConfig(
                    request_checksum_calculation="when_required",
                    response_checksum_validation="when_required",
                )
            client_kwargs["config"] = client_config
            client = boto3.client(**client_kwargs)
            client.head_bucket(Bucket=bucket)
        except Exception as exc:  # noqa: BLE001
            details["error"] = type(exc).__name__
            return ProbeResult(False, _("Falha ao acessar o bucket S3/R2."), details)
        return ProbeResult(True, _("Bucket S3/R2 acessível."), details)

    def test_observability(self) -> ProbeResult:
        dsn = str(getattr(settings, "SENTRY_DSN", "") or "").strip()
        details = {
            "dsn_configured": bool(dsn),
            "environment": str(getattr(settings, "SENTRY_ENVIRONMENT", "") or ""),
            "traces_sample_rate": float(getattr(settings, "SENTRY_TRACES_SAMPLE_RATE", 0) or 0),
        }
        if not dsn:
            return ProbeResult(True, _("Sentry desligado (sem DSN)."), details)
        if "://" not in dsn or "@" not in dsn:
            return ProbeResult(False, _("SENTRY_DSN parece inválido."), details)
        return ProbeResult(True, _("DSN do Sentry presente e com formato válido."), details)


def _tcp_open(host: str, port: int, timeout: float) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


def bootstrap_integration_overlay() -> None:
    """Carrega overlay no boot, ignorando falhas sem migration."""

    try:
        if "staff_integrationsettings" not in connection.introspection.table_names():
            return
    except Exception:  # noqa: BLE001
        return
    try:
        DjangoRuntimeSettingsApplier().apply_all()
    except Exception:  # noqa: BLE001, S110
        pass
