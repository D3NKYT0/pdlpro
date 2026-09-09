from __future__ import annotations

from dataclasses import dataclass
from typing import Any, BinaryIO

from apps.themes.application.theme_packages import (
    activate_theme,
    delete_theme,
    get_active_theme,
    install_theme,
    list_themes,
)
from apps.themes.domain.repositories import IThemePackageRepository
from common.architecture.base import UnitOfWork, UseCase


class GetActiveThemeUseCase(UseCase[None, dict]):
    """Devolve o tema ativo serializado para o cliente público.

    Uso: resolva pelo container e chame ``execute(None)``. O retorno é o dicionário de
    metadados e caminhos do tema.
    """

    def __init__(self, packages: IThemePackageRepository) -> None:
        self._packages = packages

    def execute(self, data: None = None) -> dict:
        return get_active_theme(self._packages)


class ListThemesUseCase(UseCase[None, list[dict]]):
    """Lista o tema default e os pacotes instalados.

    Uso: resolva pelo container e chame ``execute(None)``. O retorno é ``list[dict]``.
    """

    def __init__(self, packages: IThemePackageRepository) -> None:
        self._packages = packages

    def execute(self, data: None = None) -> list[dict]:
        return list_themes(self._packages)


@dataclass(frozen=True, slots=True)
class InstallThemeInput:
    """Dados de entrada de ``InstallThemeUseCase.execute``."""

    upload: BinaryIO
    size: int
    user: Any


class InstallThemeUseCase(UseCase[InstallThemeInput, dict]):
    """Valida e publica um ZIP de tema.

    Uso: resolva pelo container e chame ``execute(data)`` com ``InstallThemeInput``.
    """

    def __init__(self, packages: IThemePackageRepository, unit_of_work: UnitOfWork) -> None:
        self._packages = packages
        self._unit_of_work = unit_of_work

    def execute(self, data: InstallThemeInput) -> dict:
        return install_theme(
            data.upload,
            size=data.size,
            user=data.user,
            packages=self._packages,
            unit_of_work=self._unit_of_work,
        )


@dataclass(frozen=True, slots=True)
class ActivateThemeInput:
    """Dados de entrada de ``ActivateThemeUseCase.execute``.

    ``package_id`` None restaura o tema default.
    """

    package_id: str | None


class ActivateThemeUseCase(UseCase[ActivateThemeInput, dict]):
    """Ativa um pacote instalado ou restaura o tema default.

    Uso: resolva pelo container e chame ``execute(data)`` com ``ActivateThemeInput``.
    """

    def __init__(self, packages: IThemePackageRepository, unit_of_work: UnitOfWork) -> None:
        self._packages = packages
        self._unit_of_work = unit_of_work

    def execute(self, data: ActivateThemeInput) -> dict:
        return activate_theme(
            data.package_id,
            packages=self._packages,
            unit_of_work=self._unit_of_work,
        )


@dataclass(frozen=True, slots=True)
class DeleteThemeInput:
    """Dados de entrada de ``DeleteThemeUseCase.execute``."""

    package_id: str


class DeleteThemeUseCase(UseCase[DeleteThemeInput, None]):
    """Remove um pacote inativo do catálogo e do disco.

    Uso: resolva pelo container e chame ``execute(data)`` com ``DeleteThemeInput``.
    """

    def __init__(self, packages: IThemePackageRepository, unit_of_work: UnitOfWork) -> None:
        self._packages = packages
        self._unit_of_work = unit_of_work

    def execute(self, data: DeleteThemeInput) -> None:
        delete_theme(
            data.package_id,
            packages=self._packages,
            unit_of_work=self._unit_of_work,
        )
