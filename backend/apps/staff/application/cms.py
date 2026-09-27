from __future__ import annotations

from urllib.parse import urlparse

from django.utils.text import slugify

from apps.content.domain.faq import FaqAudience, FaqCategory
from apps.content.domain.repositories import (
    IBannerAdminRepository,
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
        "title_en": row.title_en,
        "title_es": row.title_es,
        "description": row.description,
        "description_en": row.description_en,
        "description_es": row.description_es,
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
        row.title_en = _text(data, "title_en", limit=200)
        row.title_es = _text(data, "title_es", limit=200)
        row.description = _text(data, "description")
        row.description_en = _text(data, "description_en")
        row.description_es = _text(data, "description_es")
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


def _dump_banner(row) -> dict:
    return {
        "id": str(row.id),
        "title": row.title,
        "title_en": row.title_en,
        "title_es": row.title_es,
        "badge": row.badge,
        "badge_en": row.badge_en,
        "badge_es": row.badge_es,
        "description": row.description,
        "description_en": row.description_en,
        "description_es": row.description_es,
        "image_url": row.get_image_url(),
        "link": row.link,
        "link_text": row.link_text,
        "link_text_en": row.link_text_en,
        "link_text_es": row.link_text_es,
        "secondary_link": row.secondary_link,
        "secondary_link_text": row.secondary_link_text,
        "secondary_link_text_en": row.secondary_link_text_en,
        "secondary_link_text_es": row.secondary_link_text_es,
        "display_type": row.display_type,
        "target_location": row.target_location,
        "dismiss_policy": row.dismiss_policy,
        "dismiss_days": row.dismiss_days,
        "auto_close": row.auto_close,
        "auto_close_delay": row.auto_close_delay,
        "show_close_button": row.show_close_button,
        "width_px": row.width_px,
        "is_active": row.is_active,
        "order": row.order,
        "start_date": row.start_date.isoformat() if row.start_date else None,
        "end_date": row.end_date.isoformat() if row.end_date else None,
        "created_at": row.created_at.isoformat() if hasattr(row, "created_at") and row.created_at else None,
    }


class ListStaffBannersUseCase(UseCase[None, list[dict]]):
    """Lista todos os banners para a interface administrativa do painel."""

    def __init__(self, banners: IBannerAdminRepository) -> None:
        self._banners = banners

    def execute(self, data: None = None) -> list[dict]:
        return [_dump_banner(item) for item in self._banners.list_all()]


class UpsertStaffBannerUseCase(UseCase[dict, dict]):
    """Cria ou atualiza um banner administrativo."""

    def __init__(self, banners: IBannerAdminRepository) -> None:
        self._banners = banners

    def execute(self, data: dict) -> dict:
        title = _text(data, "title", limit=200)
        if not title:
            raise ValidationDomainError("Informe o título do banner.")

        banner_id = parse_optional_uuid(data.get("id"))
        row = self._banners.get_by_id(banner_id) if banner_id else None
        if banner_id and row is None:
            raise EntityNotFoundError("Banner não encontrado.")

        if row is None:
            row = self._banners.new(title=title)

        row.title = title
        row.title_en = _text(data, "title_en", limit=200)
        row.title_es = _text(data, "title_es", limit=200)
        row.badge = _text(data, "badge", limit=50)
        row.badge_en = _text(data, "badge_en", limit=50)
        row.badge_es = _text(data, "badge_es", limit=50)
        row.description = _text(data, "description")
        row.description_en = _text(data, "description_en")
        row.description_es = _text(data, "description_es")
        row.image_url = _text(data, "image_url", limit=500)
        row.link = _text(data, "link", limit=300)
        row.link_text = _text(data, "link_text", limit=100)
        row.link_text_en = _text(data, "link_text_en", limit=100)
        row.link_text_es = _text(data, "link_text_es", limit=100)
        row.secondary_link = _text(data, "secondary_link", limit=300)
        row.secondary_link_text = _text(data, "secondary_link_text", limit=100)
        row.secondary_link_text_en = _text(data, "secondary_link_text_en", limit=100)
        row.secondary_link_text_es = _text(data, "secondary_link_text_es", limit=100)
        row.display_type = _text(data, "display_type", limit=20) or "popup"
        row.target_location = _text(data, "target_location", limit=30) or "landing_and_coming_soon"
        row.dismiss_policy = _text(data, "dismiss_policy", limit=20) or "days"
        row.dismiss_days = parse_non_negative_int(data.get("dismiss_days"), default=7)
        row.auto_close = _bool(data, "auto_close", default=False)
        row.auto_close_delay = parse_non_negative_int(data.get("auto_close_delay"), default=10)
        row.show_close_button = _bool(data, "show_close_button", default=True)
        width_val = data.get("width_px")
        row.width_px = parse_non_negative_int(width_val, default=640) if width_val else 640
        row.is_active = _bool(data, "is_active", default=True)
        row.order = parse_non_negative_int(data.get("order"), default=0)

        start_date_raw = data.get("start_date")
        row.start_date = parse_required_datetime(start_date_raw) if start_date_raw else None
        end_date_raw = data.get("end_date")
        row.end_date = parse_required_datetime(end_date_raw) if end_date_raw else None

        self._banners.save(row)
        return _dump_banner(row)


class DeleteStaffBannerUseCase(UseCase[dict, dict]):
    """Remove um banner."""

    def __init__(self, banners: IBannerAdminRepository) -> None:
        self._banners = banners

    def execute(self, data: dict) -> dict:
        banner_id = parse_required_uuid(data.get("id"))
        if not self._banners.delete(banner_id):
            raise EntityNotFoundError("Banner não encontrado.")
        return {"deleted": True}

