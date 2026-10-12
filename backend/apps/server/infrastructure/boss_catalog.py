from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.server.domain.bosses import IBossCatalog
from apps.server.infrastructure.lineage.npc_catalog import XmlNpcCatalog
from common.models import BaseModel


class RankingBoss(BaseModel):
    """Configura nome, categoria pública e origem do respawn sem escrever no jogo."""

    npc_id = models.PositiveIntegerField(
        _("ID do NPC"), unique=True,
        validators=[MinValueValidator(1), MaxValueValidator(2147483647)],
    )
    name = models.CharField(_("Nome"), max_length=255, blank=True,
                           help_text=_("Deixe vazio para usar o nome do acervo de NPCs."))
    category = models.CharField(
        _("Categoria"), max_length=8,
        choices=[("epic", _("Épico")), ("raid", _("Normal"))], default="epic",
    )
    source = models.CharField(
        _("Origem do respawn"), max_length=8,
        choices=[("epic", _("Tabela de épicos")), ("raid", _("Tabela de raids"))],
        default="epic",
    )
    active = models.BooleanField(_("Ativo"), default=True)

    class Meta:
        ordering = ["name", "npc_id"]
        verbose_name = _("Boss do ranking")
        verbose_name_plural = _("Bosses do ranking")

    def __str__(self):
        return f"{self.npc_id} — {self.name}"

    def clean(self):
        """Preenche nomes conhecidos e exige nome explícito para NPC customizado desconhecido."""
        super().clean()
        self.name = self.name.strip()
        if not self.name:
            npc = XmlNpcCatalog().get(self.npc_id)
            if npc:
                self.name = npc["name"]
            else:
                raise ValidationError({"name": _("Informe o nome para um NPC que não está no acervo.")})


class DjangoBossCatalog(IBossCatalog):
    """Lê configurações do painel, inclusive bloqueios de publicação."""

    def list_all(self) -> list[dict]:
        return list(RankingBoss.objects.values("npc_id", "name", "category", "source", "active"))
