"""Raças de Interlude e High Five derivadas da classe do personagem."""

from __future__ import annotations

RACE_HUMAN = "human"
RACE_ELF = "elf"
RACE_DARK_ELF = "dark_elf"
RACE_ORC = "orc"
RACE_DWARF = "dwarf"
RACE_KAMAEL = "kamael"

RACES = (RACE_HUMAN, RACE_ELF, RACE_DARK_ELF, RACE_ORC, RACE_DWARF, RACE_KAMAEL)


def race_from_class(class_id: int) -> str:
    """Devolve o código estável da raça a partir do identificador de classe."""

    cid = int(class_id or 0)
    if 0 <= cid <= 17 or 88 <= cid <= 98:
        return RACE_HUMAN
    if 18 <= cid <= 30 or 99 <= cid <= 105:
        return RACE_ELF
    if 31 <= cid <= 43 or 106 <= cid <= 112:
        return RACE_DARK_ELF
    if 44 <= cid <= 52 or 113 <= cid <= 116:
        return RACE_ORC
    if 53 <= cid <= 57 or 117 <= cid <= 118:
        return RACE_DWARF
    if 123 <= cid <= 136:
        return RACE_KAMAEL
    return RACE_HUMAN
