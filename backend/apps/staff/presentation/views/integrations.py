"""API superadmin do configurador de integrações (pagamentos, Lineage, SMTP)."""

from __future__ import annotations

from dataclasses import asdict

from django.utils.translation import gettext as _
from django.utils.translation import gettext_lazy
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.staff.application.integrations import (
    GetIntegrationsStatusUseCase,
    PatchIntegrationSectionInput,
    PatchIntegrationSectionUseCase,
    TestIntegrationSectionInput,
    TestIntegrationSectionUseCase,
)
from apps.staff.domain.integrations import SECTIONS
from common.architecture.exceptions import ValidationDomainError
from common.permissions import IsSuperAdmin
from common.views import InjectedAPIView


def _status_payload(status_obj) -> dict:
    return {
        "revision": status_obj.revision,
        "payments": asdict(status_obj.payments),
        "lineage": asdict(status_obj.lineage),
        "smtp": asdict(status_obj.smtp),
    }


class StaffIntegrationsStatusView(InjectedAPIView):
    """GET do status mascarado das três seções."""

    permission_classes = [IsAuthenticated, IsSuperAdmin]

    @extend_schema(
        tags=["Staff"],
        summary=gettext_lazy("Status das integrações"),
        description=gettext_lazy(
            "Retorna campos públicos e fingerprints de segredos. Nunca expõe valores em claro."
        ),
    )
    def get(self, request):
        return Response(_status_payload(self.resolve(GetIntegrationsStatusUseCase).execute()))


class StaffIntegrationsSectionView(InjectedAPIView):
    """PATCH de uma seção (payments|lineage|smtp)."""

    permission_classes = [IsAuthenticated, IsSuperAdmin]

    @extend_schema(
        tags=["Staff"],
        summary=gettext_lazy("Atualizar seção de integração"),
        description=gettext_lazy(
            "Mescla o payload na seção. Omitido ou vazio em segredo = manter; "
            "__CLEAR__ = apagar; valor novo = substituir e selar."
        ),
    )
    def patch(self, request, section: str):
        section = (section or "").strip().lower()
        if section not in SECTIONS:
            return Response({"detail": _("Seção inválida.")}, status=status.HTTP_404_NOT_FOUND)
        payload = request.data or {}
        if not isinstance(payload, dict):
            return Response({"detail": _("Payload inválido.")}, status=status.HTTP_400_BAD_REQUEST)
        try:
            result = self.resolve(PatchIntegrationSectionUseCase).execute(
                PatchIntegrationSectionInput(
                    section=section,
                    patch=dict(payload),
                    actor_id=getattr(request.user, "id", None),
                )
            )
        except ValidationDomainError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(_status_payload(result))


class StaffIntegrationsTestView(InjectedAPIView):
    """POST de teste operacional da seção."""

    permission_classes = [IsAuthenticated, IsSuperAdmin]

    @extend_schema(
        tags=["Staff"],
        summary=gettext_lazy("Testar seção de integração"),
        description=gettext_lazy(
            "Valida credenciais (pagamentos), probe MySQL/TCP (lineage) ou envia e-mail de teste (smtp)."
        ),
    )
    def post(self, request, section: str):
        section = (section or "").strip().lower()
        if section not in SECTIONS:
            return Response({"detail": _("Seção inválida.")}, status=status.HTTP_404_NOT_FOUND)
        payload = request.data or {}
        to_email = str(payload.get("to_email") or "").strip()
        if section == "smtp" and not to_email:
            to_email = str(getattr(request.user, "email", "") or "").strip()
        try:
            result = self.resolve(TestIntegrationSectionUseCase).execute(
                TestIntegrationSectionInput(section=section, to_email=to_email)
            )
        except ValidationDomainError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        # Resultado operacional (ok/falha) fica no corpo; HTTP 200 evita o contrato de erro
        # mascarar fingerprints/details do probe.
        return Response(asdict(result), status=status.HTTP_200_OK)
