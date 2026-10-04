"""Persistência e validação revogável de sessões de representação administrativa."""

from datetime import timedelta
from uuid import UUID

from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed, TokenError
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.domain.impersonation import IImpersonationStore
from apps.accounts.infrastructure.models import ImpersonationSession, User
from common.architecture.exceptions import AuthorizationError, ConflictError


class DjangoImpersonationStore(IImpersonationStore):
    """Mantém auditoria durável e verifica expiração, revogação e permissão do autor."""

    def list_users(self, search, page):
        rows = User.objects.filter(
            Q(username__icontains=search)
            | Q(email__icontains=search)
            | Q(display_name__icontains=search)
        ).order_by("username", "id")
        return {
            "count": rows.count(),
            "results": [
                {
                    "id": str(u.id),
                    "username": u.username,
                    "email": u.email,
                    "display_name": u.display_name,
                    "can_impersonate": u.is_active
                    and not u.is_staff_member
                    and not u.is_superuser
                    and u.role in ("player", "supporter"),
                }
                for u in rows[(page - 1) * 20 : page * 20]
            ],
        }

    def start(self, actor_id, target_id, original_jti):
        row, created = ImpersonationSession.objects.get_or_create(
            original_jti=original_jti,
            defaults={
                "actor": User.objects.get(id=actor_id),
                "target": User.objects.get(id=target_id),
                "expires_at": timezone.now() + timedelta(hours=1),
            },
        )
        if not created:
            raise ConflictError()
        return str(row.id)

    def _require(self, session_id):
        try:
            row = ImpersonationSession.objects.select_related("actor", "target").get(
                id=UUID(str(session_id)), ended_at__isnull=True
            )
        except (ImpersonationSession.DoesNotExist, ValueError) as exc:
            raise AuthorizationError() from exc
        if not row.actor.is_active or not row.actor.is_superuser:
            raise AuthorizationError()
        original = OutstandingToken.objects.filter(
            jti=row.original_jti, user=row.actor
        ).first()
        if original is None:
            raise AuthorizationError()
        try:
            JWTAuthentication().get_user(RefreshToken(original.token))
        except (TokenError, AuthenticationFailed) as exc:
            raise AuthorizationError() from exc
        return row

    def validate(self, session_id, target_id):
        """Rejeita access/refresh fora do vínculo ou após encerramento/revogação."""
        row = self._require(session_id)
        if (
            row.expires_at <= timezone.now()
            or str(row.target.id) != str(target_id)
            or not row.target.is_active
            or row.target.is_staff_member
            or row.target.is_superuser
            or row.target.role not in ("player", "supporter")
        ):
            raise AuthorizationError()
        return row

    def status(self, session_id):
        row = self._require(session_id)
        return {"username": row.actor.username, "target_username": row.target.username}

    def finish(self, session_id) -> UUID:
        with transaction.atomic():
            row = self._require(session_id)
            if not ImpersonationSession.objects.filter(
                id=row.id, ended_at__isnull=True
            ).update(ended_at=timezone.now()):
                raise ConflictError()
            return row.actor.id
