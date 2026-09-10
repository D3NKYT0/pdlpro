"""Custom drf-spectacular AutoSchema for the PDL PRO API."""

from __future__ import annotations

import re

from drf_spectacular.openapi import AutoSchema
from rest_framework.generics import GenericAPIView
from rest_framework.views import APIView

_IMPLEMENTA_RE = re.compile(r"\n\s*Implementa\b", re.IGNORECASE)


def _first_paragraph(text: str) -> str:
    cleaned = _IMPLEMENTA_RE.split(text.strip(), maxsplit=1)[0].strip()
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", cleaned) if p.strip()]
    return paragraphs[0] if paragraphs else cleaned


def _first_line(text: str) -> str:
    paragraph = _first_paragraph(text)
    return paragraph.splitlines()[0].strip() if paragraph else ""


class PdlAutoSchema(AutoSchema):
    """Gera summary/description legíveis a partir das docstrings das views.

    Views ``InjectedAPIView`` / ``APIView`` sem ``serializer_class`` são o padrão do
    projeto; o Spectacular não deve emitir ERROR de "unable to guess serializer".
    Path params entram no ``operationId`` para evitar colisões list/detail.
    """

    def get_summary(self):
        explicit = super().get_summary()
        if explicit:
            return explicit
        method = getattr(self.view, self.method.lower(), None)
        for candidate in (
            getattr(method, "__doc__", None),
            getattr(self.view, "__doc__", None),
        ):
            if candidate:
                line = _first_line(candidate)
                if line:
                    return line[:120]
        return None

    def get_description(self):
        explicit = super().get_description()
        if explicit:
            return _first_paragraph(explicit)
        method = getattr(self.view, self.method.lower(), None)
        for candidate in (
            getattr(method, "__doc__", None),
            getattr(self.view, "__doc__", None),
        ):
            if candidate:
                paragraph = _first_paragraph(candidate)
                if paragraph:
                    return paragraph
        return None

    def _get_serializer(self):
        view = self.view
        if isinstance(view, APIView) and not isinstance(view, GenericAPIView):
            has_hook = (
                callable(getattr(view, "get_serializer", None))
                or callable(getattr(view, "get_serializer_class", None))
                or hasattr(view, "serializer_class")
            )
            if not has_hook:
                # Sem corpo/resposta tipados: @extend_schema(request=/responses=) cobre o resto.
                return None
        return super()._get_serializer()

    def _tokenize_path(self) -> list[str]:
        path = re.sub(
            pattern=self.path_prefix,
            repl="",
            string=self.path,
            flags=re.IGNORECASE,
        )
        # Mantém nomes de parâmetros ({id} → id) para distinguir list vs detail.
        path = re.sub(pattern=r"\{([\w\-]+)\}", repl=r"\1", string=path)
        tokenized_path = path.rstrip("/").lstrip("/").split("/")
        return [t for t in tokenized_path if t]
