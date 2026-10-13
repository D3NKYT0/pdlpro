from apps.programs.domain.repositories import ISupporterRepository
from common.architecture.base import UseCase


class ListPublicSupportersUseCase(UseCase[None, list[dict]]):
    """Lista parceiros aprovados para a landing, sem expor comissão ou identidade da conta."""

    def __init__(self, supporters: ISupporterRepository) -> None:
        self._supporters = supporters

    def execute(self, data: None = None) -> list[dict]:
        return self._supporters.list_public_approved()
