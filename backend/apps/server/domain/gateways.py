from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass(frozen=True, slots=True)
class ServerStatus:
    """Disponibilidade dos servidores de login e jogo e contagem informada de jogadores.

    É um objeto de dados; não carrega métodos de persistência do ORM. Consulte os campos tipados
    abaixo ao montar ou consumir o resultado.
    """

    game_online: bool
    login_online: bool
    players_online: int


@dataclass(frozen=True, slots=True)
class ServerInfo:
    """Configurações públicas de apresentação do servidor: crônica, rates e características.

    É um objeto de dados; não carrega métodos de persistência do ORM. Consulte os campos tipados
    abaixo ao montar ou consumir o resultado.
    """

    name: str
    slogan: str
    description: str
    chronicle: str
    rates: dict[str, str]
    enchant: dict[str, str]
    max_level: int
    features: list[str]
    notes: dict[str, str]
    coming_soon: bool = False
    coming_soon_title: str = ""
    coming_soon_subtitle: str = ""
    coming_soon_at: str | None = None
    seo_title: str = ""
    seo_description: str = ""
    og_title: str = ""
    og_description: str = ""
    og_image: str = ""
    discord_url: str = ""
    trailer_youtube_id: str = ""
    site_name_customized: bool = False
    site_description_customized: bool = False


@dataclass(frozen=True, slots=True)
class RankingEntry:
    """Uma posição do ranking, com nome, valor e metadados específicos em extra.

    É um objeto de dados; não carrega métodos de persistência do ORM. Consulte os campos tipados
    abaixo ao montar ou consumir o resultado.
    """

    position: int
    name: str
    value: int
    extra: dict = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class GameAccount:
    """Conta do Lineage identificada por login, com vínculo opcional ao usuário do painel.

    É um objeto de dados; não carrega métodos de persistência do ORM. Consulte os campos tipados
    abaixo ao montar ou consumir o resultado.
    """

    login: str
    email: str
    linked_user_id: str | None
    exists: bool = True


@dataclass(frozen=True, slots=True)
class GameCharacter:
    """Personagem do jogo; char_id é o identificador inteiro do Lineage, não um UUID do painel.

    É um objeto de dados; não carrega métodos de persistência do ORM. Consulte os campos tipados
    abaixo ao montar ou consumir o resultado.
    """

    char_id: int
    name: str
    level: int
    online: bool
    sex: int
    pvp: int = 0
    pk: int = 0
    class_id: int = 0
    title: str = ""
    clan_name: str = ""
    is_clan_leader: bool = False
    karma: int = 0
    adena: int = 0
    online_time: int = 0
    last_access: int = 0
    clan_id: int = 0
    ally_id: int = 0
    ally_name: str = ""
    clan_crest_base64: str = ""
    ally_crest_base64: str = ""
    hair_style: int = 0
    hair_color: int = 0
    face: int = 0


@dataclass(frozen=True, slots=True)
class ModerationCharacter:
    """Personagem com dados administrativos (conta, e-mail, acesso e posição)."""

    char_id: int
    name: str
    login: str
    email: str
    level: int
    online: bool
    sex: int
    class_id: int
    title: str
    clan_name: str
    pvp: int
    pk: int
    karma: int
    online_time: int
    last_access: int
    account_access: int
    char_access: int
    x: int
    y: int
    z: int
    linked_user_id: str | None = None


@dataclass(frozen=True, slots=True)
class GameItem:
    """Pilha de item do jogo; item_id identifica o tipo de item e slot informa equipamento quando
    presente.

    É um objeto de dados; não carrega métodos de persistência do ORM. Consulte os campos tipados
    abaixo ao montar ou consumir o resultado. ``location`` distingue INVENTORY / WAREHOUSE /
    PAPERDOLL quando a consulta devolve o campo.
    """

    item_id: int
    name: str
    quantity: int
    enchant: int
    slot: int | None = None
    location: str | None = None


@dataclass(frozen=True, slots=True)
class GameSkill:
    """Skill aprendida pelo personagem; skill_id é o identificador inteiro do Lineage.

    ``level`` é o nível (ou encanto) gravado em character_skills. ``class_index`` distingue
    a classe base das subclasses quando o servidor as armazena em linhas separadas.
    """

    skill_id: int
    level: int
    class_index: int = 0


@dataclass(frozen=True, slots=True)
class GameStoreItem:
    """Item anunciado em uma loja offline do jogo."""

    item_id: int
    quantity: int
    price: int
    enchant: int = 0
    char_id: int = 0


@dataclass(frozen=True, slots=True)
class GameStore:
    """Loja privada offline (private store) exposta pelo gameserver."""

    char_id: int
    name: str
    store_type: int
    title: str = ""
    x: int = 0
    y: int = 0
    z: int = 0
    clan_name: str = ""
    sex: int = 0
    class_id: int = 0
    items: tuple[GameStoreItem, ...] = ()


class ILineageGateway(ABC):
    """Porta de acesso a contas, personagens, itens e consultas do Lineage 2.

    Injete esta interface na aplicação; ServerProvider escolhe o adaptador. IDs de personagens e
    itens são inteiros do jogo, enquanto linked_user_id identifica o usuário do painel.
    ``query`` recebe nome de consulta do catálogo e parâmetros, nunca SQL vindo do cliente.
    Operações opcionais, como câmbio e observação, podem lançar NotImplementedError.

    O banco do jogo tem transações próprias: UnitOfWork do Django não desfaz automaticamente
    escritas feitas por esta porta.
    """

    def assert_exchange_ready(self) -> None:
        """Read-only check of durable receipts and transactional game tables."""
        raise NotImplementedError("Transferência de moedas indisponível neste servidor.")

    def exchange_coins(self, receipt: str, login: str, char_id: int, item_id: int, quantity: int, direction: str) -> None:
        """Apply once, atomically with a durable receipt in the game database."""
        raise NotImplementedError("Transferência de moedas indisponível neste servidor.")

    @abstractmethod
    def get_status(self) -> ServerStatus: ...

    @abstractmethod
    def get_top_pvp(self, limit: int = 10) -> list[RankingEntry]: ...

    @abstractmethod
    def get_top_pk(self, limit: int = 10) -> list[RankingEntry]: ...

    @abstractmethod
    def get_top_level(self, limit: int = 10) -> list[RankingEntry]: ...

    @abstractmethod
    def get_top_online(self, limit: int = 10) -> list[RankingEntry]: ...

    @abstractmethod
    def get_top_clans(self, limit: int = 10) -> list[RankingEntry]: ...

    @abstractmethod
    def get_top_adena(self, limit: int = 10) -> list[RankingEntry]: ...

    @abstractmethod
    def get_account(self, login: str) -> GameAccount | None: ...

    @abstractmethod
    def find_accounts_by_email(self, email: str) -> list[GameAccount]: ...

    @abstractmethod
    def get_account_by_login_and_email(self, login: str, email: str) -> GameAccount | None: ...

    @abstractmethod
    def register_account(self, login: str, password: str, email: str) -> GameAccount: ...

    @abstractmethod
    def validate_credentials(self, login: str, password: str) -> bool: ...

    @abstractmethod
    def link_account(self, login: str, user_id: str) -> GameAccount: ...

    @abstractmethod
    def unlink_account(self, login: str, user_id: str) -> None: ...

    @abstractmethod
    def clear_account_link(self, login: str) -> GameAccount: ...

    @abstractmethod
    def update_account_password(self, login: str, password: str) -> None: ...

    @abstractmethod
    def list_characters(self, login: str) -> list[GameCharacter]: ...

    @abstractmethod
    def get_character(self, login: str, char_id: int) -> GameCharacter | None: ...

    @abstractmethod
    def list_character_items(self, char_id: int) -> list[GameItem]: ...

    @abstractmethod
    def list_character_equipment(self, char_id: int) -> list[GameItem]: ...

    @abstractmethod
    def list_character_skills(self, char_id: int) -> list[GameSkill]: ...

    @abstractmethod
    def withdraw_item(self, char_id: int, item_id: int, quantity: int) -> GameItem: ...

    @abstractmethod
    def deposit_item(self, char_name: str, item_id: int, quantity: int, enchant: int) -> None: ...

    @abstractmethod
    def nickname_exists(self, name: str) -> bool: ...

    @abstractmethod
    def change_nickname(self, login: str, char_id: int, name: str) -> None: ...

    @abstractmethod
    def change_sex(self, login: str, char_id: int, sex: int) -> None: ...

    @abstractmethod
    def unstuck(self, login: str, char_id: int) -> None: ...

    def supports(self, capability: str) -> bool:
        """Indica se o adaptador executa o serviço ou consulta informados."""

        return capability in {"CHANGE_NICKNAME", "CHANGE_SEX", "UNSTUCK", "TELEPORT", "LINK_SLOT"}

    def search_moderation_characters(
        self,
        *,
        like: str,
        online_filter: int,
        banned_filter: int,
        limit: int,
        offset: int,
    ) -> list[ModerationCharacter]:
        """Lista personagens para a equipe. ``online_filter``/``banned_filter`` usam -1 para todos."""

        from apps.server.domain.exceptions import CharacterServiceUnavailableError

        raise CharacterServiceUnavailableError()

    def count_moderation_characters(
        self,
        *,
        like: str,
        online_filter: int,
        banned_filter: int,
    ) -> int:
        """Conta o recorte da busca administrativa de personagens."""

        from apps.server.domain.exceptions import CharacterServiceUnavailableError

        raise CharacterServiceUnavailableError()

    def get_moderation_character(self, char_id: int) -> ModerationCharacter | None:
        """Devolve o personagem administrativo pelo ``obj_Id`` do jogo."""

        from apps.server.domain.exceptions import CharacterServiceUnavailableError

        raise CharacterServiceUnavailableError()

    def set_account_access_level(self, login: str, level: int) -> None:
        """Atualiza o access level da conta Lineage (banimento usa valor negativo)."""

        from apps.server.domain.exceptions import CharacterServiceUnavailableError

        raise CharacterServiceUnavailableError()

    def kick_character(self, login: str, char_id: int) -> None:
        """Marca o personagem como offline no banco do jogo."""

        from apps.server.domain.exceptions import CharacterServiceUnavailableError

        raise CharacterServiceUnavailableError()

    def move_character(self, login: str, char_id: int, x: int, y: int, z: int) -> None:
        """Atualiza x/y/z sem exigir offline; personagem online só reflete no próximo login."""

        from apps.server.domain.exceptions import CharacterServiceUnavailableError

        raise CharacterServiceUnavailableError()

    def teleport(self, login: str, char_id: int, x: int, y: int, z: int) -> None:
        """Move o personagem offline para as coordenadas informadas."""

        from apps.server.domain.exceptions import CharacterServiceUnavailableError

        raise CharacterServiceUnavailableError()

    def change_appearance(
        self, login: str, char_id: int, hair_style: int, hair_color: int, face: int
    ) -> None:
        """Altera cabelo, cor e rosto do personagem offline."""

        from apps.server.domain.exceptions import CharacterServiceUnavailableError

        raise CharacterServiceUnavailableError()

    def clear_karma(self, login: str, char_id: int) -> None:
        """Zera o karma do personagem offline."""

        from apps.server.domain.exceptions import CharacterServiceUnavailableError

        raise CharacterServiceUnavailableError()

    def clear_pk(self, login: str, char_id: int) -> None:
        """Zera a contagem de PK do personagem offline."""

        from apps.server.domain.exceptions import CharacterServiceUnavailableError

        raise CharacterServiceUnavailableError()

    def list_private_stores(self) -> list[GameStore]:
        """Lojas offline do mundo; vazio quando o dialeto não publica a consulta."""

        return []

    def list_private_store_items(self) -> list[GameStoreItem]:
        """Itens de todas as lojas offline, com ``char_id`` para agrupar."""

        return []

    @abstractmethod
    def count_characters(self, login: str) -> int: ...

    @abstractmethod
    def verify_character_ownership(self, char_id: int, account: str) -> bool: ...

    @abstractmethod
    def transfer_character(self, char_id: int, new_account: str, *, from_account: str) -> None: ...

    def observe_items(self) -> dict:
        """Administrative read-only inventory capture, unsupported by null gateways."""
        raise NotImplementedError("Observação de itens indisponível neste gateway.")

    @abstractmethod
    def query(self, name: str, params: dict | None = None) -> list[dict]:
        """Executa uma query nomeada do catálogo SQL. Sem SQL no Python."""
        ...
