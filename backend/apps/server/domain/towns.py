"""Vilas Interlude usadas no teleporte da taverna."""

from __future__ import annotations

from dataclasses import dataclass

from common.architecture.exceptions import ValidationDomainError


@dataclass(frozen=True, slots=True)
class Town:
    """Destino de teleporte identificado por código estável, com coordenadas do jogo."""

    code: str
    x: int
    y: int
    z: int


TOWNS: tuple[Town, ...] = (
    Town("talking_island", -84318, 244579, -3730),
    Town("dark_elf", 12428, 16551, -4588),
    Town("orc", -44836, -112524, -235),
    Town("dwarf", 116551, -182493, -1525),
    Town("elven", 45873, 49288, -3058),
    Town("gludin", -80789, 149809, -3040),
    Town("gludio", -12736, 122784, -3112),
    Town("dion", 15670, 142890, -2700),
    Town("floran", 17841, 170327, -3502),
    Town("giran", 83400, 147943, -3404),
    Town("hunter", 117110, 76883, -2695),
    Town("oren", 82956, 53208, -1488),
    Town("ivory_tower", 85391, 16228, -3640),
    Town("aden", 146331, 25762, -2018),
    Town("goddard", 147928, -55273, -2728),
    Town("rune", 43799, -47727, -792),
    Town("schuttgart", 87331, -142842, -1317),
    Town("heine", 111409, 219364, -3545),
)

TOWNS_BY_CODE = {town.code: town for town in TOWNS}


def get_town(code: str) -> Town:
    """Devolve a vila do código informado; rejeita destinos desconhecidos."""

    town = TOWNS_BY_CODE.get((code or "").strip().lower())
    if town is None:
        raise ValidationDomainError("Destino de teleporte inválido.")
    return town


def nearest_town_code(x: int, y: int) -> str:
    """Código da vila mais próxima no plano XY."""

    best = TOWNS[0]
    best_distance = None
    for town in TOWNS:
        distance = (town.x - x) ** 2 + (town.y - y) ** 2
        if best_distance is None or distance < best_distance:
            best = town
            best_distance = distance
    return best.code


def town_catalog() -> list[dict]:
    """Lista pública de destinos (ids estáveis; rótulos ficam no i18n da SPA)."""

    return [{"id": town.code, "x": town.x, "y": town.y, "z": town.z} for town in TOWNS]
