"""Rotação e revogação de JWTs, serializadas por usuário com o reset de senha."""

from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.settings import api_settings
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
