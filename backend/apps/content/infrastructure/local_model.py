"""Adaptador do SDK Ollama: geração local sem ferramentas ou serviços de nuvem."""

from urllib.parse import urlsplit

from django.conf import settings
from httpx import HTTPError
from ollama import Client, ResponseError

from apps.content.application.chat import (
    ConversationModel,
    ConversationUnavailable,
    GeneratedReply,
)


class OllamaConversationModel(ConversationModel):
    """Consulta o servidor local com limite de tempo, saída estruturada e sem retries."""

    def enabled(self) -> bool:
        return settings.DENKYNHO_LLM_ENABLED

    def generate(self, messages: list[dict[str, str]]) -> GeneratedReply:
        url = urlsplit(settings.DENKYNHO_OLLAMA_URL)
        if url.scheme != "http" or url.hostname not in {"localhost", "127.0.0.1", "::1"} or url.username or url.password:
            raise ValueError("Denkynho requires a loopback Ollama server")
        model = settings.DENKYNHO_LLM_MODEL
        if not model or "cloud" in model.lower() or "/" in model:
            raise ValueError("A local model tag is required")
        client = Client(host=settings.DENKYNHO_OLLAMA_URL, timeout=settings.DENKYNHO_LLM_TIMEOUT,
                        trust_env=False, follow_redirects=False)
        schema = GeneratedReply.model_json_schema()
        # Limites grandes geram gramáticas incompatíveis em alguns runtimes.
        # O orçamento de tokens limita a geração; Pydantic valida os caracteres depois.
        schema["properties"]["text"].pop("minLength")
        schema["properties"]["text"].pop("maxLength")
        try:
            response = client.chat(model=model, messages=messages, stream=False, think=False,
                                   format=schema, keep_alive="10m",
                                   options={"temperature": 0.5, "num_ctx": 8192, "num_predict": 600})
        except (HTTPError, ResponseError, OSError) as error:
            raise ConversationUnavailable(type(error).__name__) from None
        return GeneratedReply.model_validate_json(response.message.content)
