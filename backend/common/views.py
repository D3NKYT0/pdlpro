from __future__ import annotations

from typing import TypeVar

from rest_framework.views import APIView
from rest_framework.viewsets import GenericViewSet

from common.di.container import Container

T = TypeVar("T")


class InjectedAPIView(APIView):
    """Base DRF para views que resolvem casos de uso no escopo da requisição.

    Valide o serializer, construa a entrada e chame
    ``self.resolve(MeuUseCase).execute(entrada)`` no handler HTTP. Exige
    ``DependencyInjectionMiddleware`` ativo e o caso de uso registrado no provider. Não guarda
    serviços em atributos de classe nem substitui ``permission_classes`` e as verificações de
    acesso da aplicação.
    """

    def get_container(self) -> Container:
        """Obtém o escopo do request ou explica a ausência do middleware de DI."""

        container = getattr(self.request, "container", None)
        if container is None:
            raise RuntimeError(
                "Container de DI ausente no request. "
                "Verifique se DependencyInjectionMiddleware está ativo."
            )
        return container

    def resolve(self, interface: type[T]) -> T:
        """Resolve uma porta ou caso de uso no container da requisição atual."""

        return self.get_container().resolve(interface)


class InjectedViewSet(InjectedAPIView, GenericViewSet):
    """Combina resolução de dependências por requisição com GenericViewSet.

    Use ``self.resolve(Tipo)`` nas ações e acrescente os mixins CRUD necessários. Exige o mesmo
    middleware e os mesmos registros de ``InjectedAPIView``; esta classe não implementa ações de
    listagem ou escrita por conta própria.
    """
