"""Adaptador OpenAI-compatível: geração remota com JSON validado e sem retries longos."""

from __future__ import annotations

import re
from urllib.parse import urlsplit

import httpx
from django.conf import settings

from apps.content.application.chat import (
    ConversationModel,
    ConversationUnavailable,
    GeneratedReply,
)


def _unwrap_json(content: str) -> str:
    text = content.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s*```$", "", text)
    return text


class RemoteConversationModel(ConversationModel):
    """Consulta um endpoint /chat/completions com limite de tempo e sem registrar o texto."""

    def engine(self) -> str:
        return "remote"

    def enabled(self) -> bool:
        return bool(settings.DENKYNHO_LLM_ENABLED and settings.DENKYNHO_LLM_API_URL and settings.DENKYNHO_LLM_MODEL)

    def generate(self, messages: list[dict[str, str]]) -> GeneratedReply:
        url = self._endpoint()
        model = settings.DENKYNHO_LLM_MODEL
        if not model:
            raise ValueError("A remote model id is required")
        headers = {"Accept": "application/json", "Content-Type": "application/json"}
        if settings.DENKYNHO_LLM_API_KEY:
            headers["Authorization"] = f"Bearer {settings.DENKYNHO_LLM_API_KEY}"
        payload = {
            "model": model,
            "messages": messages,
            "temperature": 0.5,
            "max_tokens": 600,
        }
        try:
            with httpx.Client(
                timeout=settings.DENKYNHO_LLM_TIMEOUT,
                trust_env=False,
                follow_redirects=False,
            ) as client:
                first = {**payload, "response_format": {"type": "json_object"}}
                response = client.post(url, json=first, headers=headers)
                if response.status_code == 400:
                    response = client.post(url, json=payload, headers=headers)
                response.raise_for_status()
                body = response.json()
                content = body["choices"][0]["message"]["content"]
        except (httpx.HTTPError, OSError, KeyError, TypeError, IndexError) as error:
            raise ConversationUnavailable(type(error).__name__) from None
        if not isinstance(content, str) or not content.strip():
            raise ConversationUnavailable("EmptyRemoteReply")
        return GeneratedReply.model_validate_json(_unwrap_json(content))

    def _endpoint(self) -> str:
        parsed = urlsplit(settings.DENKYNHO_LLM_API_URL)
        if parsed.scheme not in {"http", "https"} or not parsed.hostname or parsed.username or parsed.password:
            raise ValueError("Denkynho remote API requires an http(s) URL without credentials")
        base = settings.DENKYNHO_LLM_API_URL.rstrip("/")
        if base.endswith("/chat/completions"):
            return base
        return f"{base}/chat/completions"
