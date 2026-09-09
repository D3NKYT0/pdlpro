from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.content.application.assistant import (
    AssistantReplyInput,
    AssistantReplyUseCase,
    valid_preferred_name,
)
from apps.content.application.chat import (
    MESSAGE_MAX_LENGTH,
    ChatInput,
    ChatReplyUseCase,
)
from apps.content.application.denkynho import (
    CareDenkynhoInput,
    CareDenkynhoUseCase,
    GetDenkynhoProfileUseCase,
    UpdateDenkynhoPreferencesInput,
    UpdateDenkynhoPreferencesUseCase,
)
from apps.content.application.screens import canonical_screen
from apps.content.application.use_cases import ListFaqInput, ListFaqUseCase
from apps.content.domain.faq import FaqAudience
from common.i18n import resolve_language
from common.views import InjectedAPIView


class AuthenticatedFaqListView(InjectedAPIView):
    """Entrega ajuda pública e interna conforme a identidade autenticada da requisição."""

    permission_classes = (IsAuthenticated,)

    @extend_schema(
        tags=["Conteúdo"],
        summary="Listar FAQ autenticado",
        description="Entrega ajuda pública e interna conforme a identidade autenticada da requisição.",
    )
    def get(self, request):
        user = request.user
        if user.is_superuser:
            audience = FaqAudience.SUPERADMIN
        elif user.is_staff_member:
            audience = FaqAudience.STAFF
        else:
            audience = FaqAudience.PUBLIC
        language = resolve_language(request.query_params.get("lang"))
        return Response(self.resolve(ListFaqUseCase).execute(ListFaqInput(audience=audience, language=language)))


class AssistantPreferencesSerializer(serializers.Serializer):
    """Valida preferências explícitas da conversa sem gravá-las no perfil da conta."""

    preferred_name = serializers.CharField(max_length=30, allow_blank=True, required=False)
    detail = serializers.ChoiceField(choices=["brief", "balanced", "detailed"], required=False)

    def validate_preferred_name(self, value):
        if not valid_preferred_name(value):
            raise serializers.ValidationError("Use um nome de até 30 letras, sem termos ofensivos.")
        return value


class AssistantReplySerializer(serializers.Serializer):
    message = serializers.CharField(max_length=MESSAGE_MAX_LENGTH, trim_whitespace=True, allow_blank=False)
    language = serializers.ChoiceField(choices=["auto", "pt", "en", "es"], default="auto")
    conversation = serializers.BooleanField(default=False)
    context = serializers.CharField(max_length=60000, allow_blank=True, default="")
    preferences = AssistantPreferencesSerializer(required=False)
    screen = serializers.CharField(max_length=80, allow_blank=True, required=False, default="")

    def validate_screen(self, value):
        return canonical_screen(value) or ""


class AssistantReplyView(InjectedAPIView):
    """Interpreta uma mensagem sem persistir seu texto e devolve apenas conteúdo autorizado."""

    permission_classes = (IsAuthenticated,)

    @extend_schema(
        tags=["Conteúdo"],
        summary="Responder com o assistente",
        description="Interpreta uma mensagem sem persistir seu texto e devolve apenas conteúdo autorizado.",
        request=AssistantReplySerializer,
    )
    def post(self, request):
        serializer = AssistantReplySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        if user.is_superuser:
            audience = FaqAudience.SUPERADMIN
        elif user.is_staff_member:
            audience = FaqAudience.STAFF
        else:
            audience = FaqAudience.PUBLIC
        data = dict(serializer.validated_data)
        conversational = data.pop("conversation")
        context = data.pop("context")
        preferences = data.pop("preferences", None)
        screen = data.pop("screen", "")
        if conversational:
            result = self.resolve(ChatReplyUseCase).execute(ChatInput(
                audience=audience, user_id=str(user.pk), account_id=user.id,
                display_name=user.display_name or user.username,
                context=context, preferences=preferences, screen=screen, **data,
            ))
        else:
            result = self.resolve(AssistantReplyUseCase).execute(AssistantReplyInput(audience=audience, **data))
        return Response(result)


class DenkynhoCareSerializer(serializers.Serializer):
    """Valida uma ação do tamagotchi e sua chave idempotente gerada no cliente."""

    action = serializers.ChoiceField(choices=["feed", "sleep", "play", "bath", "walk", "care", "dance"])
    idempotency_key = serializers.UUIDField()


class DenkynhoPreferencesSerializer(serializers.Serializer):
    """Valida apelido e tamanho persistidos no mascote, sem gravar o chat."""

    preferred_name = serializers.CharField(max_length=30, allow_blank=True)
    detail = serializers.ChoiceField(choices=["brief", "balanced", "detailed"])

    def validate_preferred_name(self, value):
        if not valid_preferred_name(value):
            raise serializers.ValidationError("Use um nome de até 30 letras, sem termos ofensivos.")
        return value


class DenkynhoProfileView(InjectedAPIView):
    """Lê e cuida somente do Denkynho da sessão autenticada atual."""

    permission_classes = (IsAuthenticated,)

    @extend_schema(
        tags=["Conteúdo"],
        summary="Perfil do Denkynho",
        description="Retorna o perfil do Denkynho vinculado à sessão autenticada atual.",
    )
    def get(self, request):
        return Response(self.resolve(GetDenkynhoProfileUseCase).execute(request.user.id))

    @extend_schema(
        tags=["Conteúdo"],
        summary="Atualizar preferências do Denkynho",
        description="Atualiza apelido e nível de detalhe persistidos no mascote da conta autenticada.",
        request=DenkynhoPreferencesSerializer,
    )
    def patch(self, request):
        serializer = DenkynhoPreferencesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(self.resolve(UpdateDenkynhoPreferencesUseCase).execute(UpdateDenkynhoPreferencesInput(
            user_id=request.user.id,
            **serializer.validated_data,
        )))

    @extend_schema(
        tags=["Conteúdo"],
        summary="Cuidar do Denkynho",
        description="Executa uma ação de cuidado no Denkynho da sessão autenticada atual.",
        request=DenkynhoCareSerializer,
    )
    def post(self, request):
        serializer = DenkynhoCareSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(self.resolve(CareDenkynhoUseCase).execute(CareDenkynhoInput(
            user_id=request.user.id,
            **serializer.validated_data,
        )))
