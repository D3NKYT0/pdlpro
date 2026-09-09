from __future__ import annotations

from abc import ABC, abstractmethod

ITEM_CATEGORIES = [
    (key, label)
    for key, label in (
        ("COMUM", "Comum"),
        ("WEAPON", "Arma"),
        ("SHIELD", "Escudo"),
        ("HELMET", "Elmo"),
        ("ARMOR", "Armadura"),
        ("PANTS", "Calça"),
        ("BOOTS", "Botas"),
        ("GLOVES", "Luvas"),
        ("NECKLACE", "Colar"),
        ("EARRING", "Brinco"),
        ("RING", "Anel"),
        ("HAIR", "Acessório"),
        ("FACE", "Máscara"),
        ("UNDERWEAR", "Roupa íntima"),
        ("FORMAL", "Traje"),
        ("PET", "Pet"),
    )
]
ITEM_GRADES = [(grade, grade) for grade in ("NG", "D", "C", "B", "A", "S")]


class IItemDisplayName(ABC):
    """Porta mínima para resolver o nome de exibição de um item do jogo."""

    @abstractmethod
    def display_name(self, item_id: int, fallback: str | None = None) -> str:
        raise NotImplementedError


class IItemCatalog(ABC):
    """Porta do catálogo de itens (XML + custom) usada pela aplicação de server/staff."""

    @abstractmethod
    def xml_contains(self, item_id: int) -> bool:
        """Indica se o ID pertence ao catálogo XML oficial."""

        raise NotImplementedError

    @abstractmethod
    def display_name(self, item_id: int, fallback: str | None = None) -> str:
        raise NotImplementedError

    @abstractmethod
    def metadata(self, item_id: int) -> dict:
        """Metadados públicos do item (categoria, grau, ícone, origem, etc.)."""

        raise NotImplementedError

    @abstractmethod
    def is_tradeable(self, item_id: int) -> bool:
        raise NotImplementedError

    @abstractmethod
    def list_public_items(self) -> list[dict]:
        """Lista metadados públicos de todos os itens do catálogo composto."""

        raise NotImplementedError

    @abstractmethod
    def default_icon_url(self) -> str:
        raise NotImplementedError
