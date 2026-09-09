from __future__ import annotations

from typing import Any

from apps.themes.domain.repositories import IThemePackageRepository
from apps.themes.infrastructure.models import ThemePackage


class DjangoThemePackageRepository(IThemePackageRepository):
    """Adaptador Django de ``IThemePackageRepository``."""

    def get_active(self) -> ThemePackage | None:
        return ThemePackage.objects.filter(is_active=True).first()

    def exists_active(self) -> bool:
        return ThemePackage.objects.filter(is_active=True).exists()

    def list_all(self) -> list[ThemePackage]:
        return list(ThemePackage.objects.all())

    def exists_slug_version(self, slug: str, version: str) -> bool:
        return ThemePackage.objects.filter(slug=slug, version=version).exists()

    def create(self, **fields) -> ThemePackage:
        return ThemePackage.objects.create(**fields)

    def deactivate_all(self) -> None:
        ThemePackage.objects.select_for_update().filter(is_active=True).update(is_active=False)

    def lock_get(self, package_id: str) -> ThemePackage | None:
        try:
            return ThemePackage.objects.select_for_update().get(id=package_id)
        except (ThemePackage.DoesNotExist, ValueError):
            return None

    def get(self, package_id: str) -> ThemePackage | None:
        try:
            return ThemePackage.objects.get(id=package_id)
        except (ThemePackage.DoesNotExist, ValueError):
            return None

    def save(self, row: ThemePackage, *, update_fields: tuple[str, ...] | None = None) -> ThemePackage:
        if update_fields is None:
            row.save()
        else:
            row.save(update_fields=list(update_fields))
        return row

    def delete(self, row: ThemePackage) -> None:
        row.delete()
