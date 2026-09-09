from __future__ import annotations

from uuid import UUID

from django.contrib.auth import get_user_model
from django.db.models import Q

from apps.content.domain.repositories import (
    IContentCatalogRepository,
    IDenkynhoRepository,
    INewsAdminRepository,
)
from apps.content.infrastructure.models import (
    CalendarEvent,
    DenkynhoCareAction,
    DenkynhoProfile,
    DownloadLink,
    Faq,
    News,
    WikiPage,
)

User = get_user_model()


class DjangoNewsAdminRepository(INewsAdminRepository):
    """Adaptador Django de ``INewsAdminRepository`` para notícias do painel."""

    def list_all(self) -> list[News]:
        return list(News.objects.all().order_by("-published_at", "-created_at"))

    def get_by_id(self, news_id: UUID) -> News | None:
        return News.objects.filter(id=news_id).first()

    def slug_exists(self, slug: str, *, exclude_id: UUID | None = None) -> bool:
        qs = News.objects.filter(slug=slug)
        if exclude_id is not None:
            qs = qs.exclude(id=exclude_id)
        return qs.exists()

    def new(self, **fields) -> News:
        return News(**fields)

    def save(self, row: News) -> News:
        row.save()
        return row


class DjangoContentCatalogRepository(IContentCatalogRepository):
    """Adaptador Django do catálogo público CMS."""

    def list_published_news(self) -> list[News]:
        return list(News.objects.filter(is_published=True))

    def get_published_news_by_slug(self, slug: str) -> News | None:
        return News.objects.filter(slug=slug, is_published=True).first()

    def list_published_faq(
        self,
        *,
        audiences: list[str],
        assistant_only: bool | None = False,
    ) -> list[Faq]:
        rows = Faq.objects.filter(is_published=True, audience__in=audiences)
        if assistant_only is not None:
            rows = rows.filter(assistant_only=assistant_only)
        return list(rows)

    def list_published_downloads(self) -> list[DownloadLink]:
        return list(DownloadLink.objects.filter(is_published=True))

    def list_published_wiki(self) -> list[WikiPage]:
        return list(WikiPage.objects.filter(is_published=True))

    def get_published_wiki_by_slug(self, slug: str) -> WikiPage | None:
        return WikiPage.objects.filter(slug=slug, is_published=True).first()

    def search_published_wiki(self, query: str, *, limit: int = 30) -> list[WikiPage]:
        rows = WikiPage.objects.filter(is_published=True).filter(
            Q(title__icontains=query) | Q(summary__icontains=query) | Q(body__icontains=query)
        )
        return list(rows[:limit])

    def list_published_calendar(self) -> list[CalendarEvent]:
        return list(CalendarEvent.objects.filter(is_published=True))


class DjangoDenkynhoRepository(IDenkynhoRepository):
    """Adaptador Django de ``IDenkynhoRepository`` para perfil e cuidados do mascote."""

    def require_user(self, user_id: UUID):
        return User.objects.get(id=user_id)

    def get_locked_profile(self, user) -> DenkynhoProfile:
        DenkynhoProfile.objects.get_or_create(user=user)
        return DenkynhoProfile.objects.select_for_update().get(user=user)

    def find_care_action(self, profile, idempotency_key: UUID) -> DenkynhoCareAction | None:
        return DenkynhoCareAction.objects.filter(
            profile=profile,
            idempotency_key=idempotency_key,
        ).first()

    def create_care_action(
        self,
        profile,
        *,
        idempotency_key: UUID,
        action: str,
        xp_gained: int,
    ) -> DenkynhoCareAction:
        return DenkynhoCareAction.objects.create(
            profile=profile,
            idempotency_key=idempotency_key,
            action=action,
            xp_gained=xp_gained,
        )

    def get_preferences(self, account_id: UUID) -> dict[str, str]:
        user = User.objects.filter(id=account_id).only("pk").first()
        if user is None:
            return {"name": "", "detail": "balanced"}
        profile = (
            DenkynhoProfile.objects.filter(user=user).only("preferred_name", "detail").first()
        )
        if profile is None:
            return {"name": "", "detail": "balanced"}
        detail = profile.detail if profile.detail in {"brief", "balanced", "detailed"} else "balanced"
        return {"name": profile.preferred_name, "detail": detail}
