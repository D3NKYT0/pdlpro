from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle

from apps.accounts.application.webauthn_service import (
    WebAuthnError,
    begin_authentication,
    begin_registration,
    complete_authentication,
    complete_registration,
)
from apps.accounts.infrastructure.authentication import build_auth_response
from apps.accounts.infrastructure.models import WebAuthnCredential
from apps.accounts.presentation.serializers import PasskeyBeginSerializer, PasskeyCompleteSerializer, PasskeyCredentialSerializer
from common.views import InjectedAPIView


class PasskeyListView(InjectedAPIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        rows = WebAuthnCredential.objects.filter(user=request.user)
        return Response(PasskeyCredentialSerializer(rows, many=True).data)


class PasskeyRegisterBeginView(InjectedAPIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PasskeyBeginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(begin_registration(request.user, serializer.validated_data.get("nickname", "")))


class PasskeyRegisterCompleteView(InjectedAPIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PasskeyCompleteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            row = complete_registration(request.user, **serializer.validated_data)
        except WebAuthnError as exc:
            return Response({"message": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(PasskeyCredentialSerializer(row).data, status=status.HTTP_201_CREATED)


class PasskeyLoginBeginView(InjectedAPIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [AnonRateThrottle]

    def post(self, request):
        serializer = PasskeyBeginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(begin_authentication(serializer.validated_data.get("login", "")))


class PasskeyLoginCompleteView(InjectedAPIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [AnonRateThrottle]

    def post(self, request):
        serializer = PasskeyCompleteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            user = complete_authentication(serializer.validated_data["state"], serializer.validated_data["credential"])
        except WebAuthnError:
            return Response({"message": "Não foi possível autenticar com esta chave."}, status=status.HTTP_401_UNAUTHORIZED)
        if user.is_2fa_enabled:
            from apps.accounts.application.twofa import make_login_challenge
            return Response({"requires_2fa": True, "challenge": make_login_challenge(user.id)})
        return build_auth_response(request, user)


class PasskeyDeleteView(InjectedAPIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, credential_id):
        deleted, _ = WebAuthnCredential.objects.filter(id=credential_id, user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT if deleted else status.HTTP_404_NOT_FOUND)
