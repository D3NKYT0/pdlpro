"""Contrato HTTP estrito para gerenciamento de papéis na SPA."""

from collections.abc import Mapping

from django.utils.translation import gettext_lazy as _
from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.response import Response

from apps.accounts.application.access_management import AccessManagementService
from apps.accounts.domain.access import ROLE_CAPABILITIES
from common.architecture.exceptions import AuthorizationError
from common.permissions import IsSuperAdmin
from common.views import InjectedAPIView


class AccessUpdateSerializer(serializers.Serializer):
    """Só aceita os campos delegáveis; flags de superusuário e grants não são editáveis."""

    role = serializers.ChoiceField(choices=list(ROLE_CAPABILITIES))
    additional_roles = serializers.ListField(child=serializers.ChoiceField(choices=list(ROLE_CAPABILITIES)), max_length=9)
    is_staff = serializers.BooleanField()
    revision = serializers.CharField(min_length=64, max_length=64)

    def to_internal_value(self, data):
        if not isinstance(data, Mapping) or set(data) - set(self.fields):
            raise serializers.ValidationError({"non_field_errors": [_("Verifique os dados informados e tente novamente.")]})
        return super().to_internal_value(data)


class AccessCatalogView(InjectedAPIView):
    """Expõe templates para visualizar as capacidades antes da delegação."""

    permission_classes = [IsSuperAdmin]

    @extend_schema(tags=["Auth"], summary=_("Consultar catálogo de papéis"))
    def get(self, request):
        if request.auth and request.auth.get("impersonation"):
            raise AuthorizationError()
        return Response(self.resolve(AccessManagementService).catalog(request.user.id))


class UserAccessView(InjectedAPIView):
    """Consulta e atualiza acesso com validação no caso de uso e auditoria na porta."""

    permission_classes = [IsSuperAdmin]

    @extend_schema(tags=["Auth"], summary=_("Consultar papéis do usuário"))
    def get(self, request, user_id):
        if request.auth and request.auth.get("impersonation"):
            raise AuthorizationError()
        return Response(self.resolve(AccessManagementService).get(request.user.id, user_id))

    @extend_schema(tags=["Auth"], summary=_("Atualizar papéis do usuário"), request=AccessUpdateSerializer)
    def put(self, request, user_id):
        if request.auth and request.auth.get("impersonation"):
            raise AuthorizationError()
        serializer = AccessUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(self.resolve(AccessManagementService).update(request.user.id, user_id, **serializer.validated_data))
