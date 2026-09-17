from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from common.models import BaseModel


class CharacterJailState(BaseModel):
    """Prisão administrativa de um personagem Lineage, gravada no banco do painel.

    O teleporte para as coordenadas da prisão ocorre no banco do jogo; este registro diz se a
    equipe ainda considera o personagem preso e até quando. Herda BaseModel: use ``id`` (UUID)
    nas APIs; ``pk``/``seq_id`` são internos.
    """

    char_id = models.PositiveIntegerField(_("ID do personagem"), unique=True)
    login = models.CharField(_("Login"), max_length=45, db_index=True)
    char_name = models.CharField(_("Personagem"), max_length=35)
    jailed = models.BooleanField(_("Preso"), default=True, db_index=True)
    jail_until = models.DateTimeField(_("Preso até"), null=True, blank=True)
    jail_reason = models.CharField(_("Motivo"), max_length=255, blank=True)

    class Meta:
        verbose_name = _("Prisão do personagem")
        verbose_name_plural = _("Prisões de personagens")
        ordering = ["-updated_at"]

    def __str__(self) -> str:
        return f"{self.char_name} ({self.char_id})"


class ModerationActionLog(BaseModel):
    """Histórico de kick, prisão, banimento e teleporte executados pela equipe."""

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        on_delete=models.SET_NULL,
        related_name="moderation_actions",
        verbose_name=_("Equipe"),
    )
    actor_username = models.CharField(_("Usuário da equipe"), max_length=150)
    action = models.CharField(_("Ação"), max_length=20, db_index=True)
    char_id = models.PositiveIntegerField(_("ID do personagem"), db_index=True)
    char_name = models.CharField(_("Personagem"), max_length=35)
    login = models.CharField(_("Login"), max_length=45, db_index=True)
    reason = models.CharField(_("Motivo"), max_length=255, blank=True)
    was_online = models.BooleanField(_("Estava online"), default=False)
    details = models.JSONField(_("Detalhes"), default=dict, blank=True)

    class Meta:
        verbose_name = _("Ação de moderação")
        verbose_name_plural = _("Ações de moderação")
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.action} {self.char_name}"
