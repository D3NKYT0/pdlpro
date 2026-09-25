"""Casos de uso do configurador de integrações (superadmin)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from django.conf import settings
from django.utils.translation import gettext as _

from apps.staff.domain.integrations import (
    BOOL_KEYS,
    CLEAR_SENTINEL,
    FLOAT_KEYS,
    INT_KEYS,
    LIST_KEYS,
    MASKED_PUBLIC_KEYS,
    SECRET_KEYS,
    SECTION_DENKYNHO,
    SECTION_KEYS,
    SECTION_LINEAGE,
    SECTION_OAUTH,
    SECTION_OBSERVABILITY,
    SECTION_PAYMENTS,
    SECTION_SMTP,
    SECTION_STORAGE,
    SECTIONS,
    FieldStatus,
    IIntegrationConfigStore,
    IIntegrationProbe,
    IntegrationsStatus,
    IRuntimeSettingsApplier,
    ProbeResult,
    SectionStatus,
)
from common.architecture.base import UseCase
from common.architecture.exceptions import ValidationDomainError
from common.secrets_env import fingerprint


def _coerce_list(raw: Any) -> list[str]:
    if isinstance(raw, list):
        return [str(item).strip() for item in raw if str(item).strip()]
    text = "" if raw is None else str(raw).strip()
    if not text:
        return []
    return [part.strip() for part in text.replace(";", ",").split(",") if part.strip()]


def _coerce_value(key: str, raw: Any) -> Any:
    if key in BOOL_KEYS:
        if isinstance(raw, bool):
            return raw
        text = str(raw).strip().lower()
        if text in {"1", "true", "yes", "on"}:
            return True
        if text in {"0", "false", "no", "off"}:
            return False
        raise ValidationDomainError(_("%(key)s precisa ser booleano.") % {"key": key})
    if key in INT_KEYS:
        try:
            return int(raw)
        except (TypeError, ValueError) as exc:
            raise ValidationDomainError(_("%(key)s precisa ser um inteiro.") % {"key": key}) from exc
    if key in FLOAT_KEYS:
        try:
            return float(raw)
        except (TypeError, ValueError) as exc:
            raise ValidationDomainError(_("%(key)s precisa ser um número.") % {"key": key}) from exc
    if key in LIST_KEYS:
        return _coerce_list(raw)
    text = "" if raw is None else str(raw).strip()
    return text


def _mask_public(value: str) -> str:
    text = (value or "").strip()
    if len(text) <= 8:
        return "***" if text else ""
    return f"{text[:6]}…{text[-4:]}"


def _env_default(key: str) -> Any:
    return getattr(settings, key, None)


def _effective(section_data: dict[str, Any], key: str) -> Any:
    if key in section_data:
        return section_data[key]
    return _env_default(key)


def _field_status(section_data: dict[str, Any], key: str) -> FieldStatus:
    value = _effective(section_data, key)
    if key in SECRET_KEYS:
        text = "" if value is None else str(value)
        configured = bool(text.strip())
        return FieldStatus(
            key=key,
            configured=configured,
            fingerprint=fingerprint(text) if configured else "",
        )
    if key in MASKED_PUBLIC_KEYS:
        text = "" if value is None else str(value)
        configured = bool(text.strip())
        return FieldStatus(
            key=key,
            configured=configured,
            fingerprint=fingerprint(text) if configured else "",
            masked=_mask_public(text) if configured else "",
            value=None,
        )
    if key in LIST_KEYS:
        items = _coerce_list(value) if not isinstance(value, list) else [str(v) for v in value]
        return FieldStatus(key=key, configured=True, value=items)
    if key in BOOL_KEYS:
        return FieldStatus(key=key, configured=True, value=bool(value))
    return FieldStatus(key=key, configured=value is not None and value != "", value=value)


def _merge_patch(current: dict[str, Any], patch: dict[str, Any], allowed: tuple[str, ...]) -> dict[str, Any]:
    next_data = dict(current)
    unknown = sorted(set(patch) - set(allowed))
    if unknown:
        raise ValidationDomainError(
            _("Campos desconhecidos: %(fields)s") % {"fields": ", ".join(unknown)}
        )
    for key, raw in patch.items():
        if key not in allowed:
            continue
        if raw is None:
            continue
        if isinstance(raw, str) and raw.strip() == "":
            if key in SECRET_KEYS or key in MASKED_PUBLIC_KEYS:
                continue
            if key in LIST_KEYS:
                next_data[key] = []
                continue
            next_data[key] = ""
            continue
        if isinstance(raw, str) and raw.strip() == CLEAR_SENTINEL:
            next_data.pop(key, None)
            continue
        next_data[key] = _coerce_value(key, raw)
    return next_data


@dataclass(frozen=True)
class PatchIntegrationSectionInput:
    section: str
    patch: dict[str, Any]
    actor_id: Any = None


@dataclass(frozen=True)
class TestIntegrationSectionInput:
    section: str
    to_email: str = ""


class GetIntegrationsStatusUseCase(UseCase[None, IntegrationsStatus]):
    def __init__(self, store: IIntegrationConfigStore, applier: IRuntimeSettingsApplier) -> None:
        self._store = store
        self._applier = applier

    def execute(self, command: None = None) -> IntegrationsStatus:
        self._applier.refresh_if_stale()
        sections: dict[str, SectionStatus] = {}
        for section in SECTIONS:
            data = self._store.load_section(section)
            fields = [_field_status(data, key) for key in SECTION_KEYS[section]]
            sections[section] = SectionStatus(
                section=section,
                fields=fields,
                updated_at=self._store.section_updated_at(section),
            )
        return IntegrationsStatus(
            payments=sections[SECTION_PAYMENTS],
            lineage=sections[SECTION_LINEAGE],
            smtp=sections[SECTION_SMTP],
            oauth=sections[SECTION_OAUTH],
            denkynho=sections[SECTION_DENKYNHO],
            storage=sections[SECTION_STORAGE],
            observability=sections[SECTION_OBSERVABILITY],
            revision=self._applier.current_revision(),
        )


class PatchIntegrationSectionUseCase(UseCase[PatchIntegrationSectionInput, IntegrationsStatus]):
    def __init__(self, store: IIntegrationConfigStore, applier: IRuntimeSettingsApplier) -> None:
        self._store = store
        self._applier = applier

    def execute(self, command: PatchIntegrationSectionInput) -> IntegrationsStatus:
        section = (command.section or "").strip()
        if section not in SECTIONS:
            raise ValidationDomainError(_("Seção inválida."))
        if not isinstance(command.patch, dict):
            raise ValidationDomainError(_("Payload inválido."))
        current = self._store.load_section(section)
        merged = _merge_patch(current, command.patch, SECTION_KEYS[section])
        self._store.save_section(section, merged, actor_id=command.actor_id)
        self._applier.apply_section(section)
        return GetIntegrationsStatusUseCase(self._store, self._applier).execute()


class TestIntegrationSectionUseCase(UseCase[TestIntegrationSectionInput, ProbeResult]):
    def __init__(
        self,
        applier: IRuntimeSettingsApplier,
        probe: IIntegrationProbe,
    ) -> None:
        self._applier = applier
        self._probe = probe

    def execute(self, command: TestIntegrationSectionInput) -> ProbeResult:
        section = (command.section or "").strip()
        if section not in SECTIONS:
            raise ValidationDomainError(_("Seção inválida."))
        self._applier.refresh_if_stale()
        if section == SECTION_PAYMENTS:
            return self._probe.test_payments()
        if section == SECTION_LINEAGE:
            return self._probe.test_lineage()
        if section == SECTION_OAUTH:
            return self._probe.test_oauth()
        if section == SECTION_DENKYNHO:
            return self._probe.test_denkynho()
        if section == SECTION_STORAGE:
            return self._probe.test_storage()
        if section == SECTION_OBSERVABILITY:
            return self._probe.test_observability()
        email = (command.to_email or "").strip()
        if not email:
            raise ValidationDomainError(_("Informe o e-mail de destino do teste."))
        return self._probe.test_smtp(to_email=email)
