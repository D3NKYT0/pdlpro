"""Rotação, listagem e revogação de JWTs, serializadas por usuário com o reset de senha."""

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import AuthenticationFailed, NotFound, ValidationError
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.token_blacklist.models import (
    BlacklistedToken,
    OutstandingToken,
)
from rest_framework_simplejwt.tokens import RefreshToken


def rotate_refresh(raw):
    """Consome um refresh válido uma vez e emite seu sucessor após validar a senha atual."""
    original = RefreshToken(raw)
    with transaction.atomic():
        get_user_model().objects.select_for_update().get(
            id=original[api_settings.USER_ID_CLAIM]
        )
        refresh = RefreshToken(raw)  # Revalida a blacklist depois de obter o bloqueio.
        user = JWTAuthentication().get_user(refresh)
        refresh.blacklist()
        return RefreshToken.for_user(user)


def revoke_refresh(raw, user):
    """Revoga somente o refresh do usuário autenticado, sem aceitar tokens de terceiros."""
    if not raw:
        return
    try:
        refresh = RefreshToken(raw)
    except TokenError:
        return
    if str(refresh[api_settings.USER_ID_CLAIM]) != str(user.id):
        raise AuthenticationFailed("Refresh token não pertence à sessão.")
    with transaction.atomic():
        get_user_model().objects.select_for_update().get(pk=user.pk)
        refresh.blacklist()


def refresh_jti(raw):
    """Extrai o ``jti`` de um refresh bruto, ou ``None`` se inválido/ausente."""
    if not raw:
        return None
    try:
        return str(RefreshToken(raw)["jti"])
    except (TokenError, KeyError):
        return None


def _active_outstanding(user):
    blacklisted_ids = BlacklistedToken.objects.filter(token__user=user).values_list("token_id", flat=True)
    return (
        OutstandingToken.objects.filter(user=user, expires_at__gt=timezone.now())
        .exclude(id__in=blacklisted_ids)
        .order_by("-created_at")
    )


def list_sessions(user, *, current_jti=None):
    """Lista refresh tokens ativos do usuário, marcando a sessão corrente quando conhecida."""
    return [
        {
            "id": row.jti,
            "created_at": row.created_at,
            "expires_at": row.expires_at,
            "current": bool(current_jti) and row.jti == current_jti,
        }
        for row in _active_outstanding(user)
    ]


def revoke_session(user, jti, *, current_jti=None):
    """Revoga uma sessão ativa do usuário. Retorna se a sessão corrente foi encerrada."""
    if not jti:
        raise ValidationError({"id": "Informe a sessão."})
    with transaction.atomic():
        get_user_model().objects.select_for_update().get(pk=user.pk)
        try:
            row = OutstandingToken.objects.select_for_update().get(user=user, jti=jti)
        except OutstandingToken.DoesNotExist as exc:
            raise NotFound("Sessão não encontrada.") from exc
        if row.expires_at <= timezone.now():
            raise NotFound("Sessão não encontrada.")
        if BlacklistedToken.objects.filter(token=row).exists():
            raise NotFound("Sessão não encontrada.")
        BlacklistedToken.objects.get_or_create(token=row)
    return bool(current_jti) and jti == current_jti


def revoke_other_sessions(user, *, current_jti):
    """Revoga todas as sessões ativas exceto a corrente. Exige ``current_jti`` conhecido."""
    if not current_jti:
        raise ValidationError({"detail": "Sessão atual indisponível para preservar."})
    revoked = 0
    with transaction.atomic():
        get_user_model().objects.select_for_update().get(pk=user.pk)
        for row in _active_outstanding(user).select_for_update():
            if row.jti == current_jti:
                continue
            _, created = BlacklistedToken.objects.get_or_create(token=row)
            if created:
                revoked += 1
    return revoked
