from typing import ClassVar

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone

from common.models import BaseModel, InternalModel

from .mixins import TitleSlugMixin


class News(TitleSlugMixin, BaseModel):
    """Notícia com slug, conteúdo e controle de publicação.

    Relaciona os registros por ``author``. Herda BaseModel: use ``id`` (UUID) nas APIs;
    ``pk``/``seq_id`` são internos. Use os serviços de aplicação para operações de negócio,
    mantendo neste modelo as regras de persistência e os relacionamentos.
    """

    slug = models.SlugField(max_length=200, unique=True, blank=True)
    title = models.CharField(max_length=200)
    excerpt = models.CharField(max_length=300, blank=True)
    body = models.TextField()
    image = models.ImageField(upload_to="news/", null=True, blank=True)
    author = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True)
    published_at = models.DateTimeField(default=timezone.now)
    is_published = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Notícia"
        verbose_name_plural = "Notícias"
        ordering = ["-published_at"]

    def __str__(self) -> str:
        return self.title


class Faq(BaseModel):
    """Artigo do FAQ com resposta rápida, orientação completa e termos de busca.

    ``category`` organiza as interfaces e ``keywords`` melhora a seleção conservadora feita
    pelo assistente. Artigos com ``assistant_only`` alimentam só a consulta do Denkynho e
    não entram na página FAQ nem nas sugestões. A API expõe ``id`` (UUID); ``pk``/``seq_id``
    permanecem internos.
    """

    class Category(models.TextChoices):
        GETTING_STARTED = "getting_started", "Primeiros passos"
        ACCOUNT_SECURITY = "account_security", "Conta e segurança"
        GAME_ACCOUNTS = "game_accounts", "Contas e personagens"
        ECONOMY = "economy", "Carteira e inventário"
        COMMERCE = "commerce", "Loja e comércio"
        GAMES_REWARDS = "games_rewards", "Jogos e recompensas"
        COMMUNITY = "community", "Conteúdo e comunidade"
        SUPPORT = "support", "Ajuda e atendimento"

    class Audience(models.TextChoices):
        PUBLIC = "public", "Todos os usuários"
        STAFF = "staff", "Equipe"
        SUPERADMIN = "superadmin", "Superadministradores"

    question = models.CharField(max_length=250)
    short_answer = models.CharField(
        max_length=400,
        blank=True,
        help_text="Resposta rápida exibida primeiro pelo assistente; a resposta completa traz os detalhes.",
    )
    answer = models.TextField()
    question_en = models.CharField(max_length=250, blank=True)
    short_answer_en = models.CharField(max_length=400, blank=True)
    answer_en = models.TextField(blank=True)
    category = models.CharField(max_length=40, choices=Category.choices, default=Category.GETTING_STARTED)
    keywords = models.CharField(
        max_length=500,
        blank=True,
        help_text="Termos alternativos separados por vírgulas usados para localizar esta orientação.",
    )
    keywords_en = models.CharField(
        max_length=500,
        blank=True,
        help_text="English alternative terms separated by commas.",
    )
    audience = models.CharField(
        max_length=16,
        choices=Audience.choices,
        default=Audience.PUBLIC,
        help_text="Público mínimo autorizado a receber este artigo no assistente.",
    )
    assistant_only = models.BooleanField(
        default=False,
        help_text="Se marcado, o artigo fica só na consulta do Denkynho e não aparece na página FAQ nem nas sugestões.",
    )
    order = models.PositiveIntegerField(default=0)
    is_published = models.BooleanField(default=True)

    class Meta:
        verbose_name = "FAQ"
        verbose_name_plural = "FAQ"
        ordering = ["order", "question"]

    def __str__(self) -> str:
        return self.question


class DenkynhoProfile(BaseModel):
    """Estado do Denkynho que pertence exclusivamente a uma conta autenticada.

    Os atributos representam necessidades satisfeitas, de 0 a 100, e diminuem conforme o
    tempo passa. ``experience`` e ``level`` pertencem ao mascote daquela conta — não alteram o
    nível de personagem do jogo. ``empathy`` guarda só o sentimento que o mascote está
    acompanhando, sem o texto da conversa. As mutações de cuidado passam por
    ``CareDenkynhoUseCase``; a empatia é atualizada ao conversar.
    """

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="denkynho_profile",
    )
    satiety = models.PositiveSmallIntegerField(
        default=75,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    energy = models.PositiveSmallIntegerField(
        default=75,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    happiness = models.PositiveSmallIntegerField(
        default=75,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    hygiene = models.PositiveSmallIntegerField(
        default=75,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    experience = models.PositiveIntegerField(default=0)
    level = models.PositiveSmallIntegerField(default=1)
    last_decay_at = models.DateTimeField(default=timezone.now)
    empathy = models.CharField(
        max_length=16,
        blank=True,
        default="",
        help_text="Sentimento do usuário que o mascote está acompanhando; vazio quando não há empatia ativa.",
    )
    empathy_expires_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Quando a empatia expira, o humor volta a ser calculado só pelas necessidades do mascote.",
    )

    class Meta:
        verbose_name = "Perfil do Denkynho"
        verbose_name_plural = "Perfis do Denkynho"


class DenkynhoCareAction(InternalModel):
    """Registro idempotente de um cuidado aplicado ao Denkynho.

    A chave é única por perfil e impede que um duplo clique, reenvio ou retry de rede conceda
    atributos e XP duas vezes. Não armazena texto de conversa nem dados do jogo.
    """

    class Action(models.TextChoices):
        FEED = "feed", "Alimentar"
        SLEEP = "sleep", "Dormir"
        PLAY = "play", "Brincar"
        CARE = "care", "Dar carinho"

    profile = models.ForeignKey(
        DenkynhoProfile,
        on_delete=models.CASCADE,
        related_name="care_actions",
    )
    idempotency_key = models.UUIDField()
    action = models.CharField(max_length=12, choices=Action.choices)
    xp_gained = models.PositiveSmallIntegerField(default=0)

    class Meta:
        verbose_name = "Cuidado do Denkynho"
        verbose_name_plural = "Cuidados do Denkynho"
        constraints: ClassVar[list[models.UniqueConstraint]] = [
            models.UniqueConstraint(
                fields=["profile", "idempotency_key"],
                name="content_denkynho_care_idempotency",
            ),
        ]


class DownloadLink(BaseModel):
    """Link de download organizado por categoria e estado de publicação. Herda BaseModel: use
    ``id`` (UUID) nas APIs; ``pk``/``seq_id`` são internos. Use os serviços de aplicação para
    operações de negócio, mantendo neste modelo as regras de persistência e os relacionamentos.
    """

    title = models.CharField(max_length=120)
    url = models.URLField()
    category = models.CharField(max_length=60, default="client")
    is_published = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = "Download"
        verbose_name_plural = "Downloads"
        ordering = ["order"]

    def __str__(self) -> str:
        return self.title


class WikiPage(TitleSlugMixin, BaseModel):
    """Página da wiki com conteúdo, categoria e opções de navegação. Herda BaseModel: use ``id``
    (UUID) nas APIs; ``pk``/``seq_id`` são internos. Use os serviços de aplicação para operações
    de negócio, mantendo neste modelo as regras de persistência e os relacionamentos.
    """

    slug = models.SlugField(max_length=200, unique=True, blank=True)
    title = models.CharField(max_length=200)
    summary = models.CharField(max_length=400, blank=True)
    body = models.TextField()
    category = models.CharField(max_length=40, default="guide")
    icon = models.CharField(max_length=50, blank=True)
    order = models.IntegerField(default=0)
    is_published = models.BooleanField(default=True)
    is_menu_item = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Página do wiki"
        verbose_name_plural = "Wiki"
        ordering = ["order", "title"]

    def __str__(self) -> str:
        return self.title


class CalendarEvent(BaseModel):
    """Evento público com datas, descrição e apresentação no calendário. Herda BaseModel: use
    ``id`` (UUID) nas APIs; ``pk``/``seq_id`` são internos. Use os serviços de aplicação para
    operações de negócio, mantendo neste modelo as regras de persistência e os relacionamentos.
    """

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    color = models.CharField(max_length=20, default="gold")
    is_published = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Evento"
        verbose_name_plural = "Calendário"
        ordering = ["starts_at"]

    def __str__(self) -> str:
        return self.title
