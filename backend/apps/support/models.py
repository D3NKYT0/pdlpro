import secrets

from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from common.models import BaseModel


def make_protocol() -> str:
    return f"PDL-{timezone.now():%Y}-{secrets.token_hex(3).upper()}"


class Ticket(BaseModel):
    """Chamado de atendimento com proprietário, responsável, prioridade e ciclo de resolução.

    Relaciona os registros por ``user``, ``assigned_to``. Herda BaseModel: use ``id`` (UUID) nas
    APIs; ``pk``/``seq_id`` são internos. Use os serviços de aplicação para operações de
    negócio, mantendo neste modelo as regras de persistência e os relacionamentos.
    """

    class Status(models.TextChoices):
        """Valores aceitos para Status em Ticket.

        Use as constantes desta enumeração ao atribuir o campo; o primeiro valor de cada opção é
        persistido e o rótulo é usado na apresentação.
        """

        OPEN = "open", _("Aberto")
        IN_PROGRESS = "in_progress", _("Em atendimento")
        WAITING_USER = "waiting_user", _("Aguardando jogador")
        WAITING_TEAM = "waiting_team", _("Aguardando equipe")
        RESOLVED = "resolved", _("Resolvido")
        CLOSED = "closed", _("Fechado")

    class Category(models.TextChoices):
        """Valores aceitos para Category em Ticket.

        Use as constantes desta enumeração ao atribuir o campo; o primeiro valor de cada opção é
        persistido e o rótulo é usado na apresentação.
        """

        TECHNICAL = "technical", _("Problema técnico")
        BILLING = "billing", _("Pagamento e loja")
        ACCOUNT = "account", _("Conta e segurança")
        GAME = "game", _("Suporte ao jogo")
        BUG = "bug", _("Relatar um bug")
        REPORT = "report", _("Denúncia")
        SUGGESTION = "suggestion", _("Sugestão")
        OTHER = "other", _("Outro assunto")

    class Priority(models.TextChoices):
        """Valores aceitos para Priority em Ticket.

        Use as constantes desta enumeração ao atribuir o campo; o primeiro valor de cada opção é
        persistido e o rótulo é usado na apresentação.
        """

        LOW = "low", _("Baixa")
        NORMAL = "normal", _("Normal")
        HIGH = "high", _("Alta")
        URGENT = "urgent", _("Urgente")

    protocol = models.CharField(max_length=24, unique=True, editable=False, default=make_protocol)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="support_tickets")
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="assigned_support_tickets",
        null=True,
        blank=True,
    )
    subject = models.CharField(max_length=160)
    description = models.TextField()
    category = models.CharField(max_length=24, choices=Category.choices, default=Category.OTHER)
    priority = models.CharField(max_length=12, choices=Priority.choices, default=Priority.NORMAL)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN, db_index=True)
    context = models.JSONField(default=dict, blank=True)
    first_response_at = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    last_activity_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        verbose_name=_("Chamado")
        verbose_name_plural=_("Chamados")
        ordering = ["-last_activity_at"]
        indexes = [
            models.Index(fields=["user", "status"], name="pdl_ticket_user_status"),
            models.Index(fields=["status", "priority"], name="pdl_ticket_queue"),
        ]

    def __str__(self) -> str:
        return f"{self.protocol} — {self.subject}"


class TicketMessage(BaseModel):
    """Mensagem de um chamado, usada também para registrar eventos e notas do atendimento.

    Relaciona os registros por ``ticket``, ``author``. Herda BaseModel: use ``id`` (UUID) nas
    APIs; ``pk``/``seq_id`` são internos. Use os serviços de aplicação para operações de
    negócio, mantendo neste modelo as regras de persistência e os relacionamentos.
    """

    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name="messages")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    body = models.TextField()
    is_staff_reply = models.BooleanField(default=False)
    is_internal = models.BooleanField(default=False)

    class Meta:
        verbose_name=_("Mensagem do chamado")
        verbose_name_plural=_("Mensagens dos chamados")
        ordering = ["created_at"]

