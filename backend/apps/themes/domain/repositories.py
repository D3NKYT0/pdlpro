from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class IThemePackageRepository(ABC):
    """Porta de pacotes de tema instalados (ThemePackage).

    Injete nos casos de uso / helpers de ``theme_packages`` e registre no ThemesProvider.
    """

    @abstractmethod
    def get_active(self) -> Any | None:
        raise NotImplementedError

    @abstractmethod
    def exists_active(self) -> bool:
        raise NotImplementedError

    @abstractmethod
    def list_all(self) -> list[Any]:
        raise NotImplementedError

    @abstractmethod
    def exists_slug_version(self, slug: str, version: str) -> bool:
        raise NotImplementedError

    @abstractmethod
    def create(self, **fields) -> Any:
        raise NotImplementedError

    @abstractmethod
    def deactivate_all(self) -> None:
        raise NotImplementedError

    @abstractmethod
    def lock_get(self, package_id: str) -> Any | None:
        """Pacote sob ``select_for_update``, ou None se inválido/ausente."""

        raise NotImplementedError

    @abstractmethod
    def get(self, package_id: str) -> Any | None:
        """Pacote por id, ou None se inválido/ausente."""

        raise NotImplementedError

    @abstractmethod
    def save(self, row: Any, *, update_fields: tuple[str, ...] | None = None) -> Any:
        raise NotImplementedError

    @abstractmethod
    def delete(self, row: Any) -> None:
        raise NotImplementedError
