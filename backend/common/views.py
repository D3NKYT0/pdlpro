from __future__ import annotations

from typing import TypeVar

from rest_framework.views import APIView
from rest_framework.viewsets import GenericViewSet

from common.di.container import Container

T = TypeVar("T")


class InjectedAPIView(APIView):
    """Controller fino: resolve use cases pelo container do request."""

    def get_container(self) -> Container:
        container = getattr(self.request, "container", None)
        if container is None:
            raise RuntimeError(
                "Container de DI ausente no request. "
                "Verifique se DependencyInjectionMiddleware está ativo."
            )
        return container

    def resolve(self, interface: type[T]) -> T:
        return self.get_container().resolve(interface)


class InjectedViewSet(InjectedAPIView, GenericViewSet):
    """ViewSet com o mesmo resolve() do InjectedAPIView."""
