from typing import ClassVar

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

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
    title_en = models.CharField(max_length=200, blank=True)
    title_es = models.CharField(max_length=200, blank=True)
    excerpt = models.CharField(max_length=300, blank=True)
    excerpt_en = models.CharField(max_length=300, blank=True)
    excerpt_es = models.CharField(max_length=300, blank=True)
    body = models.TextField()
    body_en = models.TextField(blank=True)
    body_es = models.TextField(blank=True)
    image = models.ImageField(upload_to="news/", null=True, blank=True)
    author = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True)
    published_at = models.DateTimeField(default=timezone.now)
    is_published = models.BooleanField(default=False)

    class Meta:
        verbose_name=_("Notícia")
        verbose_name_plural=_("Notícias")
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
        GETTING_STARTED = "getting_started", _("Primeiros passos")
        ACCOUNT_SECURITY = "account_security", _("Conta e segurança")
        GAME_ACCOUNTS = "game_accounts", _("Contas e personagens")
        ECONOMY = "economy", _("Carteira e inventário")
        COMMERCE = "commerce", _("Loja e comércio")
        GAMES_REWARDS = "games_rewards", _("Jogos e recompensas")
        COMMUNITY = "community", _("Conteúdo e comunidade")
        SUPPORT = "support", _("Ajuda e atendimento")

    class Audience(models.TextChoices):
        PUBLIC = "public", _("Todos os usuários")
        STAFF = "staff", _("Equipe")
        SUPERADMIN = "superadmin", _("Superadministradores")

    question = models.CharField(max_length=250)
    short_answer = models.CharField(
        max_length=400,
        blank=True,
        help_text=_("Resposta rápida exibida primeiro pelo assistente; a resposta completa traz os detalhes."),
    )
    answer = models.TextField()
    question_en = models.CharField(max_length=250, blank=True)
    short_answer_en = models.CharField(max_length=400, blank=True)
    answer_en = models.TextField(blank=True)
    question_es = models.CharField(max_length=250, blank=True)
    short_answer_es = models.CharField(max_length=400, blank=True)
    answer_es = models.TextField(blank=True)
    category = models.CharField(max_length=40, choices=Category.choices, default=Category.GETTING_STARTED)
    keywords = models.CharField(
        max_length=500,
        blank=True,
        help_text=_("Termos alternativos separados por vírgulas usados para localizar esta orientação."),
    )
    keywords_en = models.CharField(
        max_length=500,
        blank=True,
        help_text=_("English alternative terms separated by commas."),
    )
    keywords_es = models.CharField(
        max_length=500,
        blank=True,
        help_text=_("Términos alternativos en español separados por comas."),
    )
    audience = models.CharField(
        max_length=16,
        choices=Audience.choices,
        default=Audience.PUBLIC,
        help_text=_("Público mínimo autorizado a receber este artigo no assistente."),
    )
    assistant_only = models.BooleanField(
        default=False,
        help_text=_("Se marcado, o artigo fica só na consulta do Denkynho e não aparece na página FAQ nem nas sugestões."),
    )
    order = models.PositiveIntegerField(default=0)
    is_published = models.BooleanField(default=True)

    class Meta:
        verbose_name=_("FAQ")
        verbose_name_plural=_("FAQ")
        ordering = ["order", "question"]

    def __str__(self) -> str:
        return self.question


class DenkynhoHandbook(Faq):
    """Proxy editorial para passo a passo do Denkynho, sem migration de conteúdo."""

    class Meta:
        proxy = True
        verbose_name=_("Passo a passo do Denkynho")
        verbose_name_plural=_("Passos a passo do Denkynho")


class DenkynhoProfile(BaseModel):
    """Estado do Denkynho que pertence exclusivamente a uma conta autenticada.

    Os atributos representam necessidades satisfeitas, de 0 a 100, e diminuem conforme o
    tempo passa. ``experience`` e ``level`` pertencem ao mascote daquela conta — não alteram o
    nível de personagem do jogo. ``empathy`` guarda só o sentimento que o mascote está
    acompanhando, sem o texto da conversa. ``preferred_name`` e ``detail`` são escolhas
    explícitas da conversa, também sem transcrição. As mutações de cuidado passam por
    ``CareDenkynhoUseCase``; a empatia é atualizada ao conversar; a visita diária ocorre na leitura.
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
    appearance = models.JSONField(default=dict, blank=True, help_text=_("Peças cosméticas liberadas e equipadas pelo usuário."))
    last_decay_at = models.DateTimeField(default=timezone.now)
    empathy = models.CharField(
        max_length=16,
        blank=True,
        default="",
        help_text=_("Sentimento do usuário que o mascote está acompanhando; vazio quando não há empatia ativa."),
    )
    empathy_expires_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text=_("Quando a empatia expira, o humor volta a ser calculado só pelas necessidades do mascote."),
    )
    preferred_name = models.CharField(
        max_length=30,
        blank=True,
        default="",
        help_text=_("Apelido opcional da conversa; não armazena o histórico."),
    )
    detail = models.CharField(
        max_length=10,
        blank=False,
        default="balanced",
        help_text=_("Tamanho preferido das respostas: brief, balanced ou detailed."),
    )
    last_visit_on = models.DateField(
        default=timezone.localdate,
        help_text=_("Último dia em que o mascote registrou uma visita; o bônus diário não se acumula."),
    )

    class Meta:
        verbose_name=_("Perfil do Denkynho")
        verbose_name_plural=_("Perfis do Denkynho")


class DenkynhoCareAction(InternalModel):
    """Registro idempotente de um cuidado aplicado ao Denkynho.

    A chave é única por perfil e impede que um duplo clique, reenvio ou retry de rede conceda
    atributos e XP duas vezes. Não armazena texto de conversa nem dados do jogo.
    """

    class Action(models.TextChoices):
        FEED = "feed", _("Alimentar")
        SLEEP = "sleep", _("Dormir")
        PLAY = "play", _("Brincar")
        CARE = "care", _("Dar carinho")
        BATH = "bath", _("Dar banho")
        WALK = "walk", _("Caminhar")
        DANCE = "dance", _("Dançar juntos")

    profile = models.ForeignKey(
        DenkynhoProfile,
        on_delete=models.CASCADE,
        related_name="care_actions",
    )
    idempotency_key = models.UUIDField()
    action = models.CharField(max_length=12, choices=Action.choices)
    xp_gained = models.PositiveSmallIntegerField(default=0)

    class Meta:
        verbose_name=_("Cuidado do Denkynho")
        verbose_name_plural=_("Cuidados do Denkynho")
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
        verbose_name=_("Download")
        verbose_name_plural=_("Downloads")
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
    title_en = models.CharField(max_length=200, blank=True)
    title_es = models.CharField(max_length=200, blank=True)
    summary = models.CharField(max_length=400, blank=True)
    summary_en = models.CharField(max_length=400, blank=True)
    summary_es = models.CharField(max_length=400, blank=True)
    body = models.TextField()
    body_en = models.TextField(blank=True)
    body_es = models.TextField(blank=True)
    category = models.CharField(max_length=40, default="guide")
    icon = models.CharField(max_length=50, blank=True)
    order = models.IntegerField(default=0)
    is_published = models.BooleanField(default=True)
    is_menu_item = models.BooleanField(default=True)

    class Meta:
        verbose_name=_("Página do wiki")
        verbose_name_plural=_("Wiki")
        ordering = ["order", "title"]

    def __str__(self) -> str:
        return self.title


class CalendarEvent(BaseModel):
    """Evento público com datas, descrição e apresentação no calendário. Herda BaseModel: use
    ``id`` (UUID) nas APIs; ``pk``/``seq_id`` são internos. Use os serviços de aplicação para
    operações de negócio, mantendo neste modelo as regras de persistência e os relacionamentos.
    """

    title = models.CharField(max_length=200)
    title_en = models.CharField(max_length=200, blank=True)
    title_es = models.CharField(max_length=200, blank=True)
    description = models.TextField(blank=True)
    description_en = models.TextField(blank=True)
    description_es = models.TextField(blank=True)
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    color = models.CharField(max_length=20, default="gold")
    is_published = models.BooleanField(default=True)

    class Meta:
        verbose_name=_("Evento")
        verbose_name_plural=_("Calendário")
        ordering = ["starts_at"]

    def __str__(self) -> str:
        return self.title


class Banner(BaseModel):
    """Banner visual ou modal informativo para a landing page, coming soon e rotas públicas."""

    class DisplayType(models.TextChoices):
        POPUP = "popup", _("Modal Pop-up (Rico)")
        VISUAL = "visual", _("Banner Visual (Flyer)")

    class TargetLocation(models.TextChoices):
        ALL = "all", _("Todas as páginas públicas")
        LANDING = "landing", _("Apenas Landing Page")
        COMING_SOON = "coming_soon", _("Apenas Coming Soon")
        LANDING_AND_COMING_SOON = "landing_and_coming_soon", _("Landing Page e Coming Soon")
        PANEL = "panel", _("Painel do Jogador")

    class DismissPolicy(models.TextChoices):
        SESSION = "session", _("1 vez por sessão")
        ALWAYS = "always", _("Sempre exibir")
        DAYS = "days", _("Não exibir novamente por X dias")
        DISMISS_FOREVER = "dismiss_forever", _("Não exibir mais após fechar")

    title = models.CharField(max_length=200, verbose_name=_("Título"))
    title_en = models.CharField(max_length=200, blank=True, verbose_name=_("Título (EN)"))
    title_es = models.CharField(max_length=200, blank=True, verbose_name=_("Título (ES)"))

    badge = models.CharField(max_length=50, blank=True, verbose_name=_("Badge / Etiqueta"))
    badge_en = models.CharField(max_length=50, blank=True, verbose_name=_("Badge (EN)"))
    badge_es = models.CharField(max_length=50, blank=True, verbose_name=_("Badge (ES)"))

    description = models.TextField(blank=True, verbose_name=_("Descrição"))
    description_en = models.TextField(blank=True, verbose_name=_("Descrição (EN)"))
    description_es = models.TextField(blank=True, verbose_name=_("Descrição (ES)"))

    image = models.ImageField(upload_to="banners/", null=True, blank=True, verbose_name=_("Imagem"))
    image_url = models.URLField(blank=True, default="", verbose_name=_("URL Externa da Imagem (opcional)"))

    link = models.CharField(max_length=300, blank=True, default="", verbose_name=_("Link Principal (opcional)"))
    link_text = models.CharField(max_length=100, blank=True, default="", verbose_name=_("Texto do Botão Principal"))
    link_text_en = models.CharField(max_length=100, blank=True, default="", verbose_name=_("Texto do Botão Principal (EN)"))
    link_text_es = models.CharField(max_length=100, blank=True, default="", verbose_name=_("Texto do Botão Principal (ES)"))

    secondary_link = models.CharField(max_length=300, blank=True, default="", verbose_name=_("Link Secundário (opcional)"))
    secondary_link_text = models.CharField(max_length=100, blank=True, default="", verbose_name=_("Texto do Botão Secundário"))
    secondary_link_text_en = models.CharField(max_length=100, blank=True, default="", verbose_name=_("Texto do Botão Secundário (EN)"))
    secondary_link_text_es = models.CharField(max_length=100, blank=True, default="", verbose_name=_("Texto do Botão Secundário (ES)"))

    display_type = models.CharField(
        max_length=20,
        choices=DisplayType.choices,
        default=DisplayType.POPUP,
        verbose_name=_("Formato de Exibição"),
    )
    target_location = models.CharField(
        max_length=30,
        choices=TargetLocation.choices,
        default=TargetLocation.LANDING_AND_COMING_SOON,
        verbose_name=_("Onde Exibir"),
    )
    dismiss_policy = models.CharField(
        max_length=20,
        choices=DismissPolicy.choices,
        default=DismissPolicy.DAYS,
        verbose_name=_("Controle de Frequência"),
    )
    dismiss_days = models.PositiveIntegerField(
        default=7,
        verbose_name=_("Dias sem reexibir"),
        help_text=_("Usado quando a frequência é configurada para X dias."),
    )

    auto_close = models.BooleanField(
        default=False,
        verbose_name=_("Fechar automaticamente"),
    )
    auto_close_delay = models.PositiveIntegerField(
        default=10,
        verbose_name=_("Tempo para fechar (segundos)"),
    )
    show_close_button = models.BooleanField(
        default=True,
        verbose_name=_("Exibir botão de fechar"),
    )
    width_px = models.PositiveIntegerField(
        default=640,
        blank=True,
        null=True,
        verbose_name=_("Largura máxima (px)"),
    )

    is_active = models.BooleanField(default=True, verbose_name=_("Ativo"))
    order = models.PositiveIntegerField(default=0, verbose_name=_("Ordem de prioridade"))
    start_date = models.DateTimeField(null=True, blank=True, verbose_name=_("Data de Início"))
    end_date = models.DateTimeField(null=True, blank=True, verbose_name=_("Data de Término"))

    class Meta:
        verbose_name = _("Banner")
        verbose_name_plural = _("Banners")
        ordering = ["order", "-created_at"]
        indexes = [
            models.Index(fields=["is_active", "target_location", "order"]),
            models.Index(fields=["start_date", "end_date"]),
        ]

    def __str__(self) -> str:
        return self.title

    def is_visible(self) -> bool:
        if not self.is_active:
            return False
        now = timezone.now()
        if self.start_date and now < self.start_date:
            return False
        if self.end_date and now > self.end_date:
            return False
        return True

    def get_image_url(self) -> str:
        if self.image:
            try:
                return self.image.url
            except Exception:
                pass
        return self.image_url or ""

