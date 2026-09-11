from __future__ import annotations

from apps.games.domain.autoconfig import KNOWN_GAME_CODES, IGameAutoconfigService
from common.architecture.base import UnitOfWork, UseCase
from common.architecture.exceptions import ValidationDomainError


class BootstrapStaffGamesUseCase(UseCase[dict, dict]):
    """Preenche configuração e conteúdo padrão dos minigames para a equipe.

    Uso: resolva pelo container e chame ``execute(data)`` com ``dict`` (``code`` opcional). O
    retorno é ``dict``. Código desconhecido levanta ``ValidationDomainError``. A operação é
    idempotente: uma segunda chamada não duplica prêmios, iscas ou baús.
    """

    def __init__(self, autoconfig: IGameAutoconfigService, unit_of_work: UnitOfWork) -> None:
        self._autoconfig = autoconfig
        self._unit_of_work = unit_of_work

    def execute(self, data: dict) -> dict:
        raw = data.get("code") if data else None
        code = str(raw).strip() if raw not in (None, "") else None
        if code is not None and code not in KNOWN_GAME_CODES:
            raise ValidationDomainError("Jogo desconhecido.")
        with self._unit_of_work:
            return self._autoconfig.bootstrap(code)
