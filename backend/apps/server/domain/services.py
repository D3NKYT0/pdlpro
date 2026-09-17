"""Códigos e capacidades dos serviços pagos de personagem."""

from __future__ import annotations

TAVERN_SERVICES = ("TELEPORT", "APPEARANCE", "CLEAR_KARMA", "CLEAR_PK")
CORE_SERVICES = ("CHANGE_NICKNAME", "CHANGE_SEX", "UNSTUCK", "LINK_SLOT")
SERVICE_CAPABILITIES = (*CORE_SERVICES, *TAVERN_SERVICES, "GAME_STORES")

SERVICE_QUERY_NAMES = {
    "CHANGE_NICKNAME": "change_nickname",
    "CHANGE_SEX": "change_sex",
    "UNSTUCK": "unstuck",
    "TELEPORT": "unstuck",
    "APPEARANCE": "change_appearance",
    "CLEAR_KARMA": "clear_karma",
    "CLEAR_PK": "clear_pk",
    "GAME_STORES": "list_private_stores",
}
