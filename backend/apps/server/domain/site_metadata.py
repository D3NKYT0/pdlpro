from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class IPackagedSiteMetadata(ABC):
    """Overlay de identidade pública vindo do pacote visual ativo.

    O adaptador do tema lê ``metadados.json``; o adaptador vazio devolve ``{}`` quando
    nenhum pacote está ativo. GetServerInfoUseCase aplica env → tema → admin.
    """

    @abstractmethod
    def get_overlay(self) -> dict[str, Any]:
        """Campos não vazios do tema ativo, ou dicionário vazio."""

        raise NotImplementedError
