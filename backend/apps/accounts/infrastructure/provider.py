from apps.accounts.application.auth_capabilities import (
    AuthCapabilitiesInput,
    GetAuthCapabilitiesUseCase,
)
from apps.accounts.application.email_use_cases import (
    ConfirmPasswordResetUseCase,
    RequestEmailVerificationUseCase,
    RequestPasswordResetUseCase,
    VerifyEmailUseCase,
)
from apps.accounts.application.oauth import BeginOAuthUseCase, CompleteOAuthUseCase
from apps.accounts.application.progress_use_cases import (
    ClaimRewardUseCase,
    GetGamerProfileUseCase,
)
from apps.accounts.application.sessions import (
    ListSessionsUseCase,
    RevokeOtherSessionsUseCase,
    RevokeRefreshUseCase,
    RevokeSessionUseCase,
    RotateRefreshUseCase,
)
from apps.accounts.application.twofa import (
    ConfirmTwoFactorUseCase,
    DisableTwoFactorUseCase,
    SetupTwoFactorUseCase,
    VerifyTwoFactorLoginUseCase,
)
from apps.accounts.application.use_cases import (
    AuthenticateUserUseCase,
    CompleteCredentialsUseCase,
    GetCurrentUserUseCase,
    RegisterUserUseCase,
    UpdateProfileUseCase,
)
from apps.accounts.application.webauthn_service import (
    BeginPasskeyAuthenticationUseCase,
    BeginPasskeyRegistrationUseCase,
    CompletePasskeyAuthenticationUseCase,
    CompletePasskeyRegistrationUseCase,
    DeletePasskeyUseCase,
    ListPasskeysUseCase,
)
from apps.accounts.domain.bag import IRewardBagPort
from apps.accounts.domain.mailer import IMailer
from apps.accounts.domain.repositories import (
    ISessionStore,
    IUserRepository,
    IWebAuthnCredentialRepository,
)
from apps.accounts.infrastructure.bag import GamesRewardBagAdapter
from apps.accounts.infrastructure.mailer import DjangoMailer
from apps.accounts.infrastructure.repositories import (
    DjangoSessionStore,
    DjangoUserRepository,
    DjangoWebAuthnCredentialRepository,
)
from common.di.container import Container
from common.di.lifetime import Lifetime
from common.di.provider import AppProvider


class AccountsProvider(AppProvider):
    """Registra portas, adaptadores e casos de uso do módulo accounts.

    O AppConfig inclui este provider no catálogo de DependencyInjection. Acrescente novos
    registros em ``register`` e escolha o lifetime conforme o estado mantido pelo serviço; views
    resolvem essas classes pelo container.
    """

    def register(self, container: Container) -> None:
        container.register(IUserRepository, DjangoUserRepository, lifetime=Lifetime.SCOPED)
        container.register(ISessionStore, DjangoSessionStore, lifetime=Lifetime.SCOPED)
        container.register(
            IWebAuthnCredentialRepository,
            DjangoWebAuthnCredentialRepository,
            lifetime=Lifetime.SCOPED,
        )
        container.register(IRewardBagPort, GamesRewardBagAdapter, lifetime=Lifetime.SCOPED)
        container.register(IMailer, DjangoMailer, lifetime=Lifetime.SINGLETON)
        container.register_self(RegisterUserUseCase, lifetime=Lifetime.TRANSIENT)
        container.register_self(CompleteCredentialsUseCase, lifetime=Lifetime.TRANSIENT)
        container.register_self(AuthenticateUserUseCase, lifetime=Lifetime.TRANSIENT)
        container.register_self(GetCurrentUserUseCase, lifetime=Lifetime.TRANSIENT)
        container.register_self(UpdateProfileUseCase, lifetime=Lifetime.TRANSIENT)
        for use_case in (
            GetAuthCapabilitiesUseCase,
            SetupTwoFactorUseCase,
            ConfirmTwoFactorUseCase,
            DisableTwoFactorUseCase,
            VerifyTwoFactorLoginUseCase,
            GetGamerProfileUseCase,
            ClaimRewardUseCase,
            RequestEmailVerificationUseCase,
            VerifyEmailUseCase,
            RequestPasswordResetUseCase,
            ConfirmPasswordResetUseCase,
            RotateRefreshUseCase,
            RevokeRefreshUseCase,
            ListSessionsUseCase,
            RevokeSessionUseCase,
            RevokeOtherSessionsUseCase,
            BeginOAuthUseCase,
            CompleteOAuthUseCase,
            BeginPasskeyRegistrationUseCase,
            CompletePasskeyRegistrationUseCase,
            BeginPasskeyAuthenticationUseCase,
            CompletePasskeyAuthenticationUseCase,
            ListPasskeysUseCase,
            DeletePasskeyUseCase,
        ):
            container.register_self(use_case, lifetime=Lifetime.TRANSIENT)
