"""Validações compartilhadas pelos adaptadores reais e em memória do jogo."""

from apps.server.domain.gateways import GameCharacter
from apps.server.domain.exceptions import CharacterOfflineRequiredError, GameAccountNotFoundError


def require_offline_character(character: GameCharacter | None) -> GameCharacter:
    """Valida o resultado de uma busca já restrita à conta autorizada.

    O gateway continua responsável por consultar usando login e char_id. Esta
    regra não consulta o banco nem substitui a autorização da conta.
    """
    if character is None:
        raise GameAccountNotFoundError("Personagem não encontrado nesta conta.")
    if character.online:
        raise CharacterOfflineRequiredError()
    return character
