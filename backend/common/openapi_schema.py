"""Custom drf-spectacular AutoSchema for the PDL PRO API."""

from __future__ import annotations

import re

from drf_spectacular.openapi import AutoSchema

_IMPLEMENTA_RE = re.compile(r"\n\s*Implementa\b", re.IGNORECASE)


def _first_paragraph(text: str) -> str:
    cleaned = _IMPLEMENTA_RE.split(text.strip(), maxsplit=1)[0].strip()
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", cleaned) if p.strip()]
    return paragraphs[0] if paragraphs else cleaned


def _first_line(text: str) -> str:
    paragraph = _first_paragraph(text)
    return paragraph.splitlines()[0].strip() if paragraph else ""


class PdlAutoSchema(AutoSchema):
    """Gera summary/description legíveis a partir das docstrings das views."""

    def get_summary(self):
        explicit = super().get_summary()
        if explicit:
            return explicit
        method = getattr(self.view, self.method.lower(), None)
        for candidate in (getattr(method, "__doc__", None), getattr(self.view, "__doc__", None)):
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
        for candidate in (getattr(method, "__doc__", None), getattr(self.view, "__doc__", None)):
            if candidate:
                paragraph = _first_paragraph(candidate)
                if paragraph:
                    return paragraph
        return None
