"""Constantes de domínio dos cuidados do Denkynho, sem dependência do ORM."""

from __future__ import annotations


class DenkynhoCareActionKind:
    """Ações de cuidado aplicadas ao mascote."""

    FEED = "feed"
    SLEEP = "sleep"
    PLAY = "play"
    CARE = "care"
    BATH = "bath"
    WALK = "walk"
    DANCE = "dance"

    ALL = (FEED, SLEEP, PLAY, CARE, BATH, WALK, DANCE)
