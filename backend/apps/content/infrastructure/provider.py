from apps.content.application.assistant import AssistantReplyUseCase, SemanticMatcher
from apps.content.application.chat import ChatReplyUseCase, ConversationModel
from apps.content.application.denkynho import (
    CareDenkynhoUseCase,
    GetDenkynhoProfileUseCase,
    UpdateDenkynhoPreferencesUseCase,
)
from apps.content.application.legal import (
    GetLegalDocumentUseCase,
    ListLegalDocumentsUseCase,
)
from apps.content.application.use_cases import (
    GetNewsUseCase,
    GetWikiPageUseCase,
    ListCalendarEventsUseCase,
    ListDownloadsUseCase,
    ListFaqUseCase,
    ListNewsUseCase,
    ListWikiPagesUseCase,
    SearchWikiUseCase,
)
from apps.content.application.wardrobe import EquipDenkynhoUseCase
from common.di.container import Container
from common.di.lifetime import Lifetime
from common.di.provider import AppProvider

from .configured_model import ConfiguredConversationModel
from .semantic import SentenceTransformerMatcher


class ContentProvider(AppProvider):
    """Registra portas, adaptadores e casos de uso do módulo content.

    O AppConfig inclui este provider no catálogo de DependencyInjection. Acrescente novos
    registros em ``register`` e escolha o lifetime conforme o estado mantido pelo serviço; views
    resolvem essas classes pelo container.
    """

    def register(self, container: Container) -> None:
        container.register(ConversationModel, ConfiguredConversationModel, lifetime=Lifetime.SINGLETON)
        container.register_self(ChatReplyUseCase, lifetime=Lifetime.TRANSIENT)
        container.register(
            SemanticMatcher,
            SentenceTransformerMatcher,
            lifetime=Lifetime.SINGLETON,
        )
        for use_case in (
            AssistantReplyUseCase,
            GetDenkynhoProfileUseCase,
            CareDenkynhoUseCase,
            UpdateDenkynhoPreferencesUseCase,
            EquipDenkynhoUseCase,
            ListNewsUseCase,
            GetNewsUseCase,
            ListFaqUseCase,
            ListDownloadsUseCase,
            ListWikiPagesUseCase,
            GetWikiPageUseCase,
            SearchWikiUseCase,
            ListCalendarEventsUseCase,
            ListLegalDocumentsUseCase,
            GetLegalDocumentUseCase,
        ):
            container.register_self(use_case, lifetime=Lifetime.TRANSIENT)
