"""Superfície estável para apps em ``extensions/*``.

Importe daqui o encanamento transversal do core. Para regras de negócio do painel,
resolva casos de uso via DI (``InjectedAPIView.resolve``) ou importe **portas**
de ``apps.<módulo>.domain`` — nunca adaptadores em ``infrastructure``.

Este módulo existe para documentar e estabilizar o que extensões podem usar sem
caçar símbolos espalhados. Novos re-exports só entram quando o contrato for
público e versionado no changelog.
"""

from __future__ import annotations

from apps.accounts.domain.mailer import IMailer
from apps.payment.domain.gateways import IPaymentGateway, IPaymentGatewayRegistry
from common.architecture.exceptions import (
    AuthorizationError,
    ConflictError,
    DomainError,
    EntityNotFoundError,
    ValidationDomainError,
)
from common.di.bootstrap import DependencyInjection
from common.di.container import Container
from common.di.lifetime import Lifetime
from common.di.provider import AppProvider
from common.hooks import HookEvent, HookNames, IHookBus, IHookHandler
from common.pagination import StandardPagination
from common.permissions import IsStaffMember, IsSuperAdmin
from common.views import InjectedAPIView, InjectedViewSet
from extensions.resources import ExtensionResource, declare_extension_resource

__all__ = [
    "AppProvider",
    "AuthorizationError",
    "ConflictError",
    "Container",
    "DependencyInjection",
    "DomainError",
    "EntityNotFoundError",
    "ExtensionResource",
    "HookEvent",
    "HookNames",
    "IHookBus",
    "IHookHandler",
    "IMailer",
    "IPaymentGateway",
    "IPaymentGatewayRegistry",
    "InjectedAPIView",
    "InjectedViewSet",
    "IsStaffMember",
    "IsSuperAdmin",
    "Lifetime",
    "StandardPagination",
    "ValidationDomainError",
    "declare_extension_resource",
]
