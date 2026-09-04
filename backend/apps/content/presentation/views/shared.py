from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.content.application.assistant import (
    AssistantReplyInput,
    AssistantReplyUseCase,
)
from apps.content.application.chat import ChatInput, ChatReplyUseCase
from apps.content.application.denkynho import (
    CareDenkynhoInput,
    CareDenkynhoUseCase,
    GetDenkynhoProfileUseCase,
)
from apps.content.application.use_cases import ListFaqInput, ListFaqUseCase
from apps.content.infrastructure.models import Faq
from common.views import InjectedAPIView


class AuthenticatedFaqListView(InjectedAPIView):
    """Entrega ajuda pública e interna conforme a identidade autenticada da requisição."""

    permission_classes = (IsAuthenticated,)

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
    conversation = serializers.BooleanField(default=False)
    context = serializers.CharField(max_length=60000, allow_blank=True, default="")


class AssistantReplyView(InjectedAPIView):
    """Interpreta uma mensagem sem persistir seu texto e devolve apenas conteúdo autorizado."""

    permission_classes = (IsAuthenticated,)

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
        data = dict(serializer.validated_data)
        conversational = data.pop("conversation")
        context = data.pop("context")
        if conversational:
            result = self.resolve(ChatReplyUseCase).execute(ChatInput(
                audience=audience, user_id=str(user.pk), account_id=user.id,
                display_name=user.display_name or user.username,
                context=context, **data,
            ))
        else:
            result = self.resolve(AssistantReplyUseCase).execute(AssistantReplyInput(audience=audience, **data))
        return Response(result)


class DenkynhoCareSerializer(serializers.Serializer):
    """Valida uma ação do tamagotchi e sua chave idempotente gerada no cliente."""

    action = serializers.ChoiceField(choices=["feed", "sleep", "play", "care"])
    idempotency_key = serializers.UUIDField()


class DenkynhoProfileView(InjectedAPIView):
    """Lê e cuida somente do Denkynho da sessão autenticada atual."""

    permission_classes = (IsAuthenticated,)

    @extend_schema(tags=["Conteúdo"])
    def get(self, request):
        return Response(self.resolve(GetDenkynhoProfileUseCase).execute(request.user.id))

    @extend_schema(tags=["Conteúdo"], request=DenkynhoCareSerializer)
    def post(self, request):
        serializer = DenkynhoCareSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(self.resolve(CareDenkynhoUseCase).execute(CareDenkynhoInput(
            user_id=request.user.id,
            **serializer.validated_data,
        )))
