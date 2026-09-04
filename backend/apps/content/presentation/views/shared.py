from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.content.application.assistant import AssistantReplyInput, AssistantReplyUseCase
from apps.content.application.use_cases import ListFaqInput, ListFaqUseCase
from apps.content.infrastructure.models import Faq
from common.views import InjectedAPIView


class AuthenticatedFaqListView(InjectedAPIView):
    """Entrega ajuda pública e interna conforme a identidade autenticada da requisição."""

    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Conteúdo"])
    def get(self, request):
        user = request.user
        if user.is_superuser:
            audience = Faq.Audience.SUPERADMIN
        elif user.is_staff_member:
            audience = Faq.Audience.STAFF
        else:
            audience = Faq.Audience.PUBLIC
        language = "en" if request.query_params.get("lang") == "en" else "pt"
        return Response(self.resolve(ListFaqUseCase).execute(ListFaqInput(audience=audience, language=language)))


class AssistantReplySerializer(serializers.Serializer):
    message = serializers.CharField(max_length=1000, trim_whitespace=True, allow_blank=False)
    language = serializers.ChoiceField(choices=["auto", "pt", "en"], default="auto")


class AssistantReplyView(InjectedAPIView):
    """Interpreta uma mensagem sem persistir seu texto e devolve apenas conteúdo autorizado."""

    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Conteúdo"], request=AssistantReplySerializer)
    def post(self, request):
        serializer = AssistantReplySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        if user.is_superuser:
            audience = Faq.Audience.SUPERADMIN
        elif user.is_staff_member:
            audience = Faq.Audience.STAFF
        else:
            audience = Faq.Audience.PUBLIC
        result = self.resolve(AssistantReplyUseCase).execute(
            AssistantReplyInput(audience=audience, **serializer.validated_data)
        )
        return Response(result)
