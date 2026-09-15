from __future__ import annotations

from urllib.parse import urlparse

from django.utils.text import slugify

from apps.content.domain.faq import FaqAudience, FaqCategory
from apps.content.domain.repositories import (
    ICalendarAdminRepository,
    IDownloadAdminRepository,
    IFaqAdminRepository,
    IWikiAdminRepository,
)
from apps.staff.application.parsing import (
    parse_non_negative_int,
    parse_optional_uuid,
    parse_required_datetime,
    parse_required_uuid,
)
from common.architecture.base import UseCase
from common.architecture.exceptions import EntityNotFoundError, ValidationDomainError
from common.richtext import is_rich_text_empty, sanitize_rich_text


def _text(data: dict, key: str, *, limit: int | None = None) -> str:
    value = str(data.get(key) or "").strip()
    return value[:limit] if limit is not None else value


def _bool(data: dict, key: str, default: bool = False) -> bool:
    if key not in data:
        return default
    return bool(data.get(key))


def _dump_calendar(row) -> dict:
    return {
        "id": str(row.id),
        "title": row.title,
        "description": row.description,
        "starts_at": row.starts_at.isoformat() if row.starts_at else None,
        "ends_at": row.ends_at.isoformat() if row.ends_at else None,
        "color": row.color,
        "is_published": row.is_published,
    }


def _dump_faq(row) -> dict:
    return {
        "id": str(row.id),
        "question": row.question,
        "short_answer": row.short_answer,
        "answer": row.answer,
        "question_en": row.question_en,
        "short_answer_en": row.short_answer_en,
        "answer_en": row.answer_en,
        "question_es": row.question_es,
        "short_answer_es": row.short_answer_es,
        "answer_es": row.answer_es,
        "category": row.category,
        "keywords": row.keywords,
        "keywords_en": row.keywords_en,
        "keywords_es": row.keywords_es,
        "audience": row.audience,
        "assistant_only": row.assistant_only,
        "order": row.order,
        "is_published": row.is_published,
    }


def _dump_wiki(row) -> dict:
    return {
        "id": str(row.id),
        "slug": row.slug,
        "title": row.title,
        "title_en": row.title_en,
        "title_es": row.title_es,
        "summary": row.summary,
        "summary_en": row.summary_en,
        "summary_es": row.summary_es,
        "body": row.body,
        "body_en": row.body_en,
        "body_es": row.body_es,
        "category": row.category,
        "icon": row.icon,
        "order": row.order,
        "is_published": row.is_published,
        "is_menu_item": row.is_menu_item,
    }


def _dump_download(row) -> dict:
    return {
        "id": str(row.id),
        "title": row.title,
        "url": row.url,
        "category": row.category,
        "order": row.order,
        "is_published": row.is_published,
    }


def _allocate_slug(title: str, exists, *, fallback: str) -> str:
    base = slugify(title)[:180] or fallback
    slug = base
    suffix = 2
    while exists(slug):
        slug = f"{base}-{suffix}"
        suffix += 1
    return slug


class ListStaffCalendarUseCase(UseCase[None, list[dict]]):
    """Lista eventos do calendário, inclusive rascunhos, para a equipe."""

    def __init__(self, events: ICalendarAdminRepository) -> None:
        self._events = events

    def execute(self, data: None = None) -> list[dict]:
        return [_dump_calendar(item) for item in self._events.list_all()]


class UpsertStaffCalendarUseCase(UseCase[dict, dict]):
    """Cria ou atualiza um evento público do calendário."""

    def __init__(self, events: ICalendarAdminRepository) -> None:
        self._events = events

    def execute(self, data: dict) -> dict:
        title = _text(data, "title", limit=200)
        if not title:
            raise ValidationDomainError("Título é obrigatório.")
        starts_at = parse_required_datetime(
            data.get("starts_at"),
            missing_message="Informe o início e o fim do evento.",
        )
        ends_at = parse_required_datetime(
            data.get("ends_at"),
            missing_message="Informe o início e o fim do evento.",
        )
        if ends_at < starts_at:
            raise ValidationDomainError("A data de término deve ser posterior ao início.")
        event_id = parse_optional_uuid(data.get("id"))
        row = self._events.get_by_id(event_id) if event_id else None
        if event_id and row is None:
            raise EntityNotFoundError("Evento não encontrado.")
        if row is None:
            row = self._events.new(title=title, starts_at=starts_at, ends_at=ends_at)
        row.title = title
        row.description = _text(data, "description")
        row.starts_at = starts_at
        row.ends_at = ends_at
        row.color = _text(data, "color", limit=20) or "gold"
        row.is_published = _bool(data, "is_published", default=True)
        self._events.save(row)
        return _dump_calendar(row)


class DeleteStaffCalendarUseCase(UseCase[dict, dict]):
    """Remove um evento do calendário."""

    def __init__(self, events: ICalendarAdminRepository) -> None:
        self._events = events

    def execute(self, data: dict) -> dict:
        event_id = parse_required_uuid(data.get("id"))
        if not self._events.delete(event_id):
            raise EntityNotFoundError("Evento não encontrado.")
        return {"deleted": True}


class ListStaffFaqUseCase(UseCase[None, list[dict]]):
    """Lista artigos do FAQ, inclusive rascunhos e handbook do Denkynho."""

    def __init__(self, faq: IFaqAdminRepository) -> None:
        self._faq = faq

    def execute(self, data: None = None) -> list[dict]:
        return [_dump_faq(item) for item in self._faq.list_all()]


class UpsertStaffFaqUseCase(UseCase[dict, dict]):
    """Cria ou atualiza um artigo do FAQ nas três línguas editoriais."""

    def __init__(self, faq: IFaqAdminRepository) -> None:
        self._faq = faq

    def execute(self, data: dict) -> dict:
        question = _text(data, "question", limit=250)
        answer = _text(data, "answer")
        if not question or not answer:
            raise ValidationDomainError("Pergunta e resposta são obrigatórias.")
        category = _text(data, "category") or FaqCategory.GETTING_STARTED
        if category not in FaqCategory.ALL:
            raise ValidationDomainError("Categoria do FAQ inválida.")
        audience = _text(data, "audience") or FaqAudience.PUBLIC
        if audience not in FaqAudience.ALL:
            raise ValidationDomainError("Audiência do FAQ inválida.")
        faq_id = parse_optional_uuid(data.get("id"))
        row = self._faq.get_by_id(faq_id) if faq_id else None
        if faq_id and row is None:
            raise EntityNotFoundError("Artigo do FAQ não encontrado.")
        if row is None:
            row = self._faq.new(question=question, answer=answer)
        row.question = question
        row.short_answer = _text(data, "short_answer", limit=400)
        row.answer = answer
        row.question_en = _text(data, "question_en", limit=250)
        row.short_answer_en = _text(data, "short_answer_en", limit=400)
        row.answer_en = _text(data, "answer_en")
        row.question_es = _text(data, "question_es", limit=250)
        row.short_answer_es = _text(data, "short_answer_es", limit=400)
        row.answer_es = _text(data, "answer_es")
        row.category = category
        row.keywords = _text(data, "keywords", limit=500)
        row.keywords_en = _text(data, "keywords_en", limit=500)
        row.keywords_es = _text(data, "keywords_es", limit=500)
        row.audience = audience
        row.assistant_only = _bool(data, "assistant_only", default=False)
        row.order = parse_non_negative_int(data.get("order"), default=0)
        row.is_published = _bool(data, "is_published", default=True)
        self._faq.save(row)
        return _dump_faq(row)


class DeleteStaffFaqUseCase(UseCase[dict, dict]):
    """Remove um artigo do FAQ."""

    def __init__(self, faq: IFaqAdminRepository) -> None:
        self._faq = faq

    def execute(self, data: dict) -> dict:
        faq_id = parse_required_uuid(data.get("id"))
        if not self._faq.delete(faq_id):
            raise EntityNotFoundError("Artigo do FAQ não encontrado.")
        return {"deleted": True}


class ListStaffWikiUseCase(UseCase[None, list[dict]]):
    """Lista páginas da wiki, inclusive rascunhos, para a equipe."""

    def __init__(self, pages: IWikiAdminRepository) -> None:
        self._pages = pages

    def execute(self, data: None = None) -> list[dict]:
        return [_dump_wiki(item) for item in self._pages.list_all()]


class UpsertStaffWikiUseCase(UseCase[dict, dict]):
    """Cria ou atualiza uma página da wiki e trata o slug antes de persistir."""

    def __init__(self, pages: IWikiAdminRepository) -> None:
        self._pages = pages

    def execute(self, data: dict) -> dict:
        title = _text(data, "title", limit=200)
        body = sanitize_rich_text(str(data.get("body") or ""))
        if not title or is_rich_text_empty(body):
            raise ValidationDomainError("Título e conteúdo são obrigatórios.")
        page_id = parse_optional_uuid(data.get("id"))
        row = self._pages.get_by_id(page_id) if page_id else None
        if page_id and row is None:
            raise EntityNotFoundError("Página do wiki não encontrada.")
        if row is None:
            row = self._pages.new(title=title, body=body)
            row.slug = _allocate_slug(title, self._pages.slug_exists, fallback="wiki")
        row.title = title
        row.body = body
        row.title_en = _text(data, "title_en", limit=200)
        row.title_es = _text(data, "title_es", limit=200)
        row.summary = _text(data, "summary", limit=400)
        row.summary_en = _text(data, "summary_en", limit=400)
        row.summary_es = _text(data, "summary_es", limit=400)
        row.body_en = sanitize_rich_text(str(data.get("body_en") or ""))
        row.body_es = sanitize_rich_text(str(data.get("body_es") or ""))
        row.category = _text(data, "category", limit=40) or "guide"
        row.icon = _text(data, "icon", limit=50)
        row.order = parse_non_negative_int(data.get("order"), default=0)
        row.is_published = _bool(data, "is_published", default=True)
        row.is_menu_item = _bool(data, "is_menu_item", default=True)
        if data.get("slug"):
            slug = slugify(str(data["slug"]))[:200]
            if self._pages.slug_exists(slug, exclude_id=page_id):
                raise ValidationDomainError("Já existe uma página com este slug.")
            row.slug = slug
        self._pages.save(row)
        return _dump_wiki(row)


class DeleteStaffWikiUseCase(UseCase[dict, dict]):
    """Remove uma página da wiki."""

    def __init__(self, pages: IWikiAdminRepository) -> None:
        self._pages = pages

    def execute(self, data: dict) -> dict:
        page_id = parse_required_uuid(data.get("id"))
        if not self._pages.delete(page_id):
            raise EntityNotFoundError("Página do wiki não encontrada.")
        return {"deleted": True}


class ListStaffDownloadsUseCase(UseCase[None, list[dict]]):
    """Lista links de download, inclusive os não publicados."""

    def __init__(self, downloads: IDownloadAdminRepository) -> None:
        self._downloads = downloads

    def execute(self, data: None = None) -> list[dict]:
        return [_dump_download(item) for item in self._downloads.list_all()]


class UpsertStaffDownloadUseCase(UseCase[dict, dict]):
    """Cria ou atualiza um link de download público."""

    def __init__(self, downloads: IDownloadAdminRepository) -> None:
        self._downloads = downloads

    def execute(self, data: dict) -> dict:
        title = _text(data, "title", limit=120)
        url = _text(data, "url", limit=200)
        if not title or not url:
            raise ValidationDomainError("Informe o título e a URL do download.")
        parsed = urlparse(url)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ValidationDomainError("Informe uma URL http ou https.")
        download_id = parse_optional_uuid(data.get("id"))
        row = self._downloads.get_by_id(download_id) if download_id else None
        if download_id and row is None:
            raise EntityNotFoundError("Download não encontrado.")
        if row is None:
            row = self._downloads.new(title=title, url=url)
        row.title = title
        row.url = url
        row.category = _text(data, "category", limit=60) or "client"
        row.order = parse_non_negative_int(data.get("order"), default=0)
        row.is_published = _bool(data, "is_published", default=True)
        self._downloads.save(row)
        return _dump_download(row)


class DeleteStaffDownloadUseCase(UseCase[dict, dict]):
    """Remove um link de download."""

    def __init__(self, downloads: IDownloadAdminRepository) -> None:
        self._downloads = downloads

    def execute(self, data: dict) -> dict:
        download_id = parse_required_uuid(data.get("id"))
        if not self._downloads.delete(download_id):
            raise EntityNotFoundError("Download não encontrado.")
        return {"deleted": True}
