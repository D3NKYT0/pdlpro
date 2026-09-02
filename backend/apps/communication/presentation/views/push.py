from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.communication.application.push_use_cases import (
    GetVapidPublicKeyUseCase,
    SubscribePushInput,
    SubscribePushUseCase,
    UnsubscribePushInput,
    UnsubscribePushUseCase,
)
from common.views import InjectedAPIView


class PushKeysSerializer(serializers.Serializer):
    """Valida as chaves auth e p256dh de uma assinatura Web Push.

    Instancie com ``data=payload`` e chame ``is_valid(raise_exception=True)`` antes de consumir
    validated_data. A autorização pertence ao fluxo chamador.

    Campos declarados: ``auth``, ``p256dh``.
    """

    auth = serializers.CharField()
    p256dh = serializers.CharField()


class SubscribePushSerializer(serializers.Serializer):
    """Valida endpoint e chaves para registrar a assinatura de push do navegador.

    Instancie com ``data=payload`` e chame ``is_valid(raise_exception=True)`` antes de consumir
    validated_data. A autorização pertence ao fluxo chamador.

    Campos declarados: ``endpoint``, ``keys``.
    """

    endpoint = serializers.URLField()
    keys = PushKeysSerializer()


class UnsubscribePushSerializer(serializers.Serializer):
    """Valida o endpoint da assinatura de push que o usuário deseja remover.

    Instancie com ``data=payload`` e chame ``is_valid(raise_exception=True)`` antes de consumir
    validated_data. A autorização pertence ao fluxo chamador.

    Campos declarados: ``endpoint``.
    """

    endpoint = serializers.URLField()


class VapidPublicKeyView(InjectedAPIView):
    """Entrada HTTP para ``GetVapidPublicKeyUseCase``.

    Implementa GET; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Push"])
    def get(self, request):
        return Response(self.resolve(GetVapidPublicKeyUseCase).execute())


class PushSubscriptionView(InjectedAPIView):
    """Entrada HTTP para ``SubscribePushUseCase``, ``UnsubscribePushUseCase``.

    Implementa POST, DELETE; registre ``as_view()`` nas URLs do módulo. Controle de acesso
    declarado: [IsAuthenticated]. Resolve a aplicação no escopo da requisição antes de montar a
    resposta.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Push"], request=SubscribePushSerializer)
    def post(self, request):
        serializer = SubscribePushSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        keys = serializer.validated_data["keys"]
        return Response(
            self.resolve(SubscribePushUseCase).execute(
                SubscribePushInput(
                    user_id=request.user.id,
                    endpoint=serializer.validated_data["endpoint"],
                    auth=keys["auth"],
                    p256dh=keys["p256dh"],
                )
            )
        )

    @extend_schema(tags=["Push"], request=UnsubscribePushSerializer)
    def delete(self, request):
        serializer = UnsubscribePushSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(
            self.resolve(UnsubscribePushUseCase).execute(
                UnsubscribePushInput(user_id=request.user.id, endpoint=serializer.validated_data["endpoint"])
            )
        )
