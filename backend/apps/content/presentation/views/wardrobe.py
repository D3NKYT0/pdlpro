from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.content.application.denkynho import GetDenkynhoProfileUseCase
from apps.content.application.wardrobe import EquipDenkynhoInput, EquipDenkynhoUseCase
from apps.content.domain.wardrobe import APPEARANCE_SLOTS
from common.views import InjectedAPIView


class DenkynhoWardrobeSerializer(serializers.Serializer):
    """Aceita apenas espaço e peça; a conta é determinada pela sessão autenticada."""

    slot = serializers.ChoiceField(choices=APPEARANCE_SLOTS)
    item_id = serializers.CharField(max_length=40, allow_blank=True)


class DenkynhoWardrobeView(InjectedAPIView):
    """Consulta os desbloqueios e equipa peças somente no mascote da própria conta."""

    permission_classes = (IsAuthenticated,)

    @extend_schema(tags=["Conteúdo"])
    def get(self, request):
        return Response(self.resolve(GetDenkynhoProfileUseCase).execute(request.user.id))

    @extend_schema(tags=["Conteúdo"], request=DenkynhoWardrobeSerializer)
    def patch(self, request):
        serializer = DenkynhoWardrobeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(self.resolve(EquipDenkynhoUseCase).execute(EquipDenkynhoInput(
            user_id=request.user.id, **serializer.validated_data,
        )))
