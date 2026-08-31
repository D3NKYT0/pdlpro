from apps.accounts.application.progress_use_cases import ClaimRewardUseCase, GetGamerProfileUseCase
from apps.accounts.application.twofa import (
    ConfirmTwoFactorUseCase,
    DisableTwoFactorUseCase,
    SetupTwoFactorUseCase,
    VerifyTwoFactorLoginUseCase,
)
from apps.accounts.application.use_cases import (
    AuthenticateUserUseCase,
    GetCurrentUserUseCase,
    RegisterUserUseCase,
    UpdateProfileUseCase,
)
from apps.accounts.domain.repositories import IUserRepository
from apps.accounts.infrastructure.repositories import DjangoUserRepository
from common.di.container import Container
from common.di.lifetime import Lifetime
from common.di.provider import AppProvider


class AccountsProvider(AppProvider):
    def register(self, container: Container) -> None:
        container.register(IUserRepository, DjangoUserRepository, lifetime=Lifetime.SCOPED)
        container.register_self(RegisterUserUseCase, lifetime=Lifetime.TRANSIENT)
        container.register_self(AuthenticateUserUseCase, lifetime=Lifetime.TRANSIENT)
        container.register_self(GetCurrentUserUseCase, lifetime=Lifetime.TRANSIENT)
        container.register_self(UpdateProfileUseCase, lifetime=Lifetime.TRANSIENT)
        for use_case in (
            SetupTwoFactorUseCase,
            ConfirmTwoFactorUseCase,
            DisableTwoFactorUseCase,
            VerifyTwoFactorLoginUseCase,
            GetGamerProfileUseCase,
            ClaimRewardUseCase,
        ):
            container.register_self(use_case, lifetime=Lifetime.TRANSIENT)
