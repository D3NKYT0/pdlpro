"""Funções de domínio legado; preferir os casos de uso injetados."""

from apps.programs.application.use_cases import (
    RequestCommissionPayoutUseCase,
    ReviewPayoutInput,
    ReviewPayoutUseCase,
    UserScopedInput,
)
from apps.wallet.domain.repositories import IWalletRepository
from common.architecture.base import UnitOfWork


def request_commission(user, *, unit_of_work: UnitOfWork):
    """Solicita repasse; preferir ``RequestCommissionPayoutUseCase`` via DI."""

    return RequestCommissionPayoutUseCase(unit_of_work=unit_of_work).execute(
        UserScopedInput(user_id=user.id)
    )


def review_payout(
    payout_id,
    decision,
    note,
    *,
    wallets: IWalletRepository,
    unit_of_work: UnitOfWork,
):
    """Credita a carteira via ``IWalletRepository`` quando a decisão for ``paid``."""

    return ReviewPayoutUseCase(wallets=wallets, unit_of_work=unit_of_work).execute(
        ReviewPayoutInput(payout_id=payout_id, status=decision, note=note)
    )
