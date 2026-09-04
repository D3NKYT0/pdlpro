"""Seleciona Ollama local, API remota ou geração desligada conforme a configuração."""

from django.conf import settings

from apps.content.application.chat import (
    ConversationModel,
    ConversationUnavailable,
    GeneratedReply,
)

from .local_model import OllamaConversationModel
from .remote_model import RemoteConversationModel


class ConfiguredConversationModel(ConversationModel):
    """Delega ao adaptador ativo sem misturar as regras de URL de cada provedor."""

    def __init__(self) -> None:
        self._ollama = OllamaConversationModel()
        self._remote = RemoteConversationModel()

    def _active(self) -> ConversationModel | None:
        if not settings.DENKYNHO_LLM_ENABLED:
            return None
        if settings.DENKYNHO_LLM_PROVIDER == "remote":
            return self._remote
        if settings.DENKYNHO_LLM_PROVIDER == "ollama":
            return self._ollama
        return None

    def engine(self) -> str:
        active = self._active()
        return active.engine() if active is not None else "ollama"

    def enabled(self) -> bool:
        active = self._active()
        return active is not None and active.enabled()

    def generate(self, messages: list[dict[str, str]]) -> GeneratedReply:
        active = self._active()
        if active is None:
            raise ConversationUnavailable("Disabled")
        return active.generate(messages)
