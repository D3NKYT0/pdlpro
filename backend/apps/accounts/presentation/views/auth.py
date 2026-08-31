from django.middleware.csrf import get_token
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.throttling import AnonRateThrottle

from apps.accounts.application.twofa import (
    ConfirmTwoFactorInput,
    ConfirmTwoFactorUseCase,
    DisableTwoFactorInput,
    DisableTwoFactorUseCase,
    SetupTwoFactorUseCase,
    VerifyTwoFactorLoginInput,
    VerifyTwoFactorLoginUseCase,
    make_login_challenge,
)
from apps.accounts.application.progress_use_cases import ClaimRewardInput, ClaimRewardUseCase, GetGamerProfileUseCase
from apps.accounts.application.email_use_cases import (
    ConfirmPasswordResetInput,
    ConfirmPasswordResetUseCase,
    RequestEmailVerificationUseCase,
    RequestPasswordResetInput,
    RequestPasswordResetUseCase,
    VerifyEmailInput,
    VerifyEmailUseCase,
)
from apps.accounts.application.use_cases import (
    AuthenticateUserInput,
    AuthenticateUserUseCase,
    GetCurrentUserInput,
    GetCurrentUserUseCase,
    RegisterUserInput,
    RegisterUserUseCase,
    UpdateProfileInput,
    UpdateProfileUseCase,
)
from apps.accounts.infrastructure.authentication import (
    build_auth_response,
    clear_auth_cookies,
    get_refresh_cookie_name,
    set_auth_cookies,
)
from apps.accounts.presentation.serializers import (
    LoginSerializer,
    RegisterSerializer,
    UpdateProfileSerializer,
    UserSerializer,
)
from common.views import InjectedAPIView


class CsrfView(InjectedAPIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(tags=["Auth"])
    def get(self, request):
        return Response({"csrfToken": get_token(request)})


class RegisterView(InjectedAPIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [AnonRateThrottle]

    @extend_schema(tags=["Auth"], request=RegisterSerializer, responses=UserSerializer)
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        user = self.resolve(RegisterUserUseCase).execute(
            RegisterUserInput(
                username=data["username"],
                email=data["email"],
                password=data["password"],
                display_name=data.get("display_name", ""),
                accept_terms=data["accept_terms"],
            )
        )
        from django.contrib.auth import get_user_model

        orm_user = get_user_model().objects.get(id=user.id)
        return build_auth_response(request, orm_user)


class LoginView(InjectedAPIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [AnonRateThrottle]

    @extend_schema(tags=["Auth"], request=LoginSerializer, responses=UserSerializer)
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        user = self.resolve(AuthenticateUserUseCase).execute(
            AuthenticateUserInput(login=data["login"], password=data["password"])
        )
        from django.contrib.auth import get_user_model

        orm_user = get_user_model().objects.get(id=user.id)
        if orm_user.is_2fa_enabled:
            return Response({"requires_2fa": True, "challenge": make_login_challenge(orm_user.id)})
        return build_auth_response(request, orm_user)


class RefreshView(InjectedAPIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(tags=["Auth"])
    def post(self, request):
        raw = request.data.get("refresh") or request.COOKIES.get(get_refresh_cookie_name())
        if not raw:
            return Response(
                {"error_code": "AUTHENTICATION_REQUIRED", "message": "Refresh token ausente."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        try:
            refresh = RefreshToken(raw)
        except TokenError:
            return Response(
                {"error_code": "AUTHENTICATION_FAILED", "message": "Refresh token inválido."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        response = Response({"ok": True})
        return set_auth_cookies(request, response, refresh=refresh)


class LogoutView(InjectedAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Auth"])
    def post(self, request):
        response = Response({"ok": True})
        return clear_auth_cookies(response)


class MeView(InjectedAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Perfil"], responses=UserSerializer)
    def get(self, request):
        user = self.resolve(GetCurrentUserUseCase).execute(GetCurrentUserInput(user_id=request.user.id))
        return Response(UserSerializer(user).data)

    @extend_schema(tags=["Perfil"], request=UpdateProfileSerializer, responses=UserSerializer)
    def patch(self, request):
        serializer = UpdateProfileSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = self.resolve(UpdateProfileUseCase).execute(
            UpdateProfileInput(user_id=request.user.id, **serializer.validated_data)
        )
        return Response(UserSerializer(user).data)


class VerifyTwoFactorLoginView(InjectedAPIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [AnonRateThrottle]

    @extend_schema(tags=["Auth"])
    def post(self, request):
        user = self.resolve(VerifyTwoFactorLoginUseCase).execute(
            VerifyTwoFactorLoginInput(challenge=request.data.get("challenge", ""), code=request.data.get("code", ""))
        )
        return build_auth_response(request, user)


class TwoFactorView(InjectedAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Perfil"])
    def post(self, request):
        action = request.data.get("action") or "setup"
        if action == "setup":
            return Response(self.resolve(SetupTwoFactorUseCase).execute(request.user.id))
        code = request.data.get("code", "")
        if action == "confirm":
            return Response(
                self.resolve(ConfirmTwoFactorUseCase).execute(ConfirmTwoFactorInput(user_id=request.user.id, code=code))
            )
        if action == "disable":
            return Response(
                self.resolve(DisableTwoFactorUseCase).execute(DisableTwoFactorInput(user_id=request.user.id, code=code))
            )
        from common.architecture.exceptions import ValidationDomainError

        raise ValidationDomainError("Ação 2FA inválida.")


class GamerProfileView(InjectedAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Perfil"])
    def get(self, request):
        return Response(self.resolve(GetGamerProfileUseCase).execute(request.user.id))


class RequestEmailVerificationView(InjectedAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Auth"])
    def post(self, request):
        return Response(self.resolve(RequestEmailVerificationUseCase).execute(request.user.id))


class VerifyEmailView(InjectedAPIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [AnonRateThrottle]

    @extend_schema(tags=["Auth"])
    def post(self, request):
        return Response(
            self.resolve(VerifyEmailUseCase).execute(VerifyEmailInput(token=request.data.get("token", "")))
        )


class RequestPasswordResetView(InjectedAPIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [AnonRateThrottle]

    @extend_schema(tags=["Auth"])
    def post(self, request):
        return Response(
            self.resolve(RequestPasswordResetUseCase).execute(
                RequestPasswordResetInput(email=request.data.get("email", ""))
            )
        )


class ConfirmPasswordResetView(InjectedAPIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [AnonRateThrottle]

    @extend_schema(tags=["Auth"])
    def post(self, request):
        return Response(
            self.resolve(ConfirmPasswordResetUseCase).execute(
                ConfirmPasswordResetInput(
                    token=request.data.get("token", ""),
                    password=request.data.get("password", ""),
                )
            )
        )


class ClaimRewardView(InjectedAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Perfil"])
    def post(self, request, reward_id):
        return Response(
            self.resolve(ClaimRewardUseCase).execute(ClaimRewardInput(user_id=request.user.id, reward_id=reward_id))
        )
