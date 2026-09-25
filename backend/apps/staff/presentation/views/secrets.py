"""API superadmin de status e ações de rotação de segredos."""

from __future__ import annotations

from dataclasses import asdict

from django.utils.translation import gettext_lazy
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.staff.application.secrets import (
    ApplySecretRotationJobInput,
    ApplySecretRotationJobUseCase,
    GetSecretsStatusUseCase,
    RequestSecretActionInput,
    RequestSecretActionUseCase,
)
from common.architecture.exceptions import ValidationDomainError
from common.permissions import IsSuperAdmin
from common.views import InjectedAPIView


def _status_payload(status_obj) -> dict:
    data = asdict(status_obj)
    data["secrets"] = [asdict(item) for item in status_obj.secrets]
    data["pending_jobs"] = list(status_obj.pending_jobs)
    data["recent_jobs"] = list(status_obj.recent_jobs)
    return data


class StaffSecretsStatusView(InjectedAPIView):
    """GET do status operacional de segredos (fingerprints, sem valores)."""

    permission_classes = [IsAuthenticated, IsSuperAdmin]

    @extend_schema(
        tags=["Staff"],
        summary=gettext_lazy("Status da rotação de segredos"),
        description=gettext_lazy(
            "Retorna fingerprints, contagem de fallbacks e jobs recentes. Não expõe valores."
        ),
    )
    def get(self, request):
        return Response(_status_payload(self.resolve(GetSecretsStatusUseCase).execute()))


class StaffSecretsActionView(InjectedAPIView):
    """POST de ação com confirmação do domínio (step-up)."""

    permission_classes = [IsAuthenticated, IsSuperAdmin]

    @extend_schema(
        tags=["Staff"],
        summary=gettext_lazy("Solicitar ação de segredo"),
        description=gettext_lazy(
            "Enfileira ou aplica rotação/prune/reencrypt/revogação. Exige confirmation=domínio."
        ),
    )
    def post(self, request):
        payload = request.data or {}
        try:
            result = self.resolve(RequestSecretActionUseCase).execute(
                RequestSecretActionInput(
                    kind=str(payload.get("kind") or ""),
                    actor_id=getattr(request.user, "id", None),
                    confirmation=str(payload.get("confirmation") or ""),
                    source="panel",
                    apply_now=bool(payload.get("apply_now", True)),
                )
            )
        except ValidationDomainError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        code = status.HTTP_200_OK if result.ok else status.HTTP_400_BAD_REQUEST
        return Response(asdict(result), status=code)


class StaffSecretsApplyJobView(InjectedAPIView):
    """POST para aplicar um job pendente pelo id."""

    permission_classes = [IsAuthenticated, IsSuperAdmin]

    @extend_schema(
        tags=["Staff"],
        summary=gettext_lazy("Aplicar job de rotação pendente"),
        description=gettext_lazy("Executa um SecretRotationJob ainda pendente ou falho."),
    )
    def post(self, request, job_id):
        try:
            result = self.resolve(ApplySecretRotationJobUseCase).execute(
                ApplySecretRotationJobInput(job_id=job_id)
            )
        except ValidationDomainError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        code = status.HTTP_200_OK if result.ok else status.HTTP_400_BAD_REQUEST
        return Response(asdict(result), status=code)
