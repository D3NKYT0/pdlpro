"""Views HTTP de portabilidade e exclusão LGPD."""

from __future__ import annotations

from django.http import FileResponse
from django.utils.translation import gettext_lazy
from drf_spectacular.utils import extend_schema
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle

from apps.accounts.application.lgpd_use_cases import (
    DeleteAccountInput,
    DeleteAccountUseCase,
    RequestAccountDeletionCodeInput,
    RequestAccountDeletionCodeUseCase,
    RequestDataExportInput,
    RequestDataExportUseCase,
    ResolveLgpdExportDownloadInput,
    ResolveLgpdExportDownloadUseCase,
)
from apps.accounts.application.terms_consent import client_ip, client_user_agent
from apps.accounts.presentation.serializers import (
    DeleteAccountSerializer,
    LgpdActionResponseSerializer,
)
from common.views import InjectedAPIView


class LgpdExportThrottle(UserRateThrottle):
    rate = "5/hour"


class LgpdDeleteThrottle(UserRateThrottle):
    rate = "10/hour"


class RequestDataExportView(InjectedAPIView):
    """Solicita pacote de portabilidade LGPD por e-mail."""

    permission_classes = [IsAuthenticated]
    throttle_classes = [LgpdExportThrottle]

    @extend_schema(
        tags=["Privacidade (LGPD)"],
        responses=LgpdActionResponseSerializer,
        summary=gettext_lazy("Exportar meus dados"),
        description=gettext_lazy(
            "Gera um pacote JSON compactado com os dados pessoais da conta e envia o link por e-mail."
        ),
    )
    def post(self, request):
        result = self.resolve(RequestDataExportUseCase).execute(
            RequestDataExportInput(
                user_id=request.user.id,
                ip=client_ip(request),
                user_agent=client_user_agent(request),
            )
        )
        payload = {"detail": result.detail}
        if result.download_url:
            payload["download_url"] = result.download_url
        if result.expires_at:
            payload["expires_at"] = result.expires_at
        return Response(payload)


class RequestAccountDeletionCodeView(InjectedAPIView):
    """Envia OTP de confirmação para exclusão da conta."""

    permission_classes = [IsAuthenticated]
    throttle_classes = [LgpdDeleteThrottle]

    @extend_schema(
        tags=["Privacidade (LGPD)"],
        responses=LgpdActionResponseSerializer,
        summary=gettext_lazy("Enviar código de exclusão"),
        description=gettext_lazy(
            "Envia um código de 6 dígitos para o e-mail cadastrado, válido por 15 minutos."
        ),
    )
    def post(self, request):
        result = self.resolve(RequestAccountDeletionCodeUseCase).execute(
            RequestAccountDeletionCodeInput(user_id=request.user.id)
        )
        return Response({"detail": result.detail}, status=202)


class DeleteAccountView(InjectedAPIView):
    """Anonimiza a conta após validar o OTP de exclusão."""

    permission_classes = [IsAuthenticated]
    throttle_classes = [LgpdDeleteThrottle]

    @extend_schema(
        tags=["Privacidade (LGPD)"],
        request=DeleteAccountSerializer,
        responses=LgpdActionResponseSerializer,
        summary=gettext_lazy("Excluir minha conta"),
        description=gettext_lazy(
            "Confirma a exclusão com o código recebido por e-mail e anonimiza os dados pessoais."
        ),
    )
    def post(self, request):
        serializer = DeleteAccountSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = self.resolve(DeleteAccountUseCase).execute(
            DeleteAccountInput(
                user_id=request.user.id,
                code=serializer.validated_data["code"],
            )
        )
        return Response({"detail": result.detail})


class LgpdExportDownloadView(InjectedAPIView):
    """Download público com token assinado do pacote LGPD."""

    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(
        tags=["Privacidade (LGPD)"],
        summary=gettext_lazy("Baixar pacote LGPD"),
        description=gettext_lazy("Baixa o arquivo .json.gz mediante token assinado enviado por e-mail."),
    )
    def get(self, request, token: str):
        export_log = self.resolve(ResolveLgpdExportDownloadUseCase).execute(
            ResolveLgpdExportDownloadInput(token=token)
        )
        handle = export_log.export_file.open("rb")
        response = FileResponse(
            handle,
            as_attachment=True,
            filename=export_log.export_file.name.rsplit("/", 1)[-1],
            content_type="application/gzip",
        )
        return response
