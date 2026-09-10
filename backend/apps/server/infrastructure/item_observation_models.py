from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils.translation import gettext_lazy as _

from common.models import BaseModel


def validate_item_ids(value):
    if (not isinstance(value, list) or len(value) > 2000
            or any(type(item) is not int or not 0 < item <= 2147483647 for item in value)
            or len(set(value)) != len(value)):
        raise ValidationError(_("Informe uma lista de até 2000 IDs positivos, sem repetições."))


class ItemObservationCategory(BaseModel):
    """Categoria usada pela equipe para organizar observações de itens. Herda BaseModel: use ``id``
    (UUID) nas APIs; ``pk``/``seq_id`` são internos. Use os serviços de aplicação para operações
    de negócio, mantendo neste modelo as regras de persistência e os relacionamentos.
    """

    name = models.CharField(_("Nome"), max_length=100, unique=True)
    description = models.TextField(_("Descrição"), blank=True)
    item_ids = models.JSONField(
        _("IDs dos itens"),
        default=list,
        blank=True,
        validators=[validate_item_ids],
        help_text=_("Exemplo: [57, 4037]. Em sobreposições, vale a primeira categoria na ordem."),
    )
    order = models.PositiveIntegerField(_("Ordem"), default=0)

    class Meta:
        verbose_name = _("Categoria de observação")
        verbose_name_plural = _("Categorias de observação")
        ordering = ["order", "name"]

    def __str__(self):
        return self.name


class ItemObservationSnapshot(BaseModel):
    """Captura persistida do estado dos itens para consulta e comparação posteriores.

    Relaciona os registros por ``created_by``. Herda BaseModel: use ``id`` (UUID) nas APIs;
    ``pk``/``seq_id`` são internos. Use os serviços de aplicação para operações de negócio,
    mantendo neste modelo as regras de persistência e os relacionamentos.
    """

    snapshot_date = models.DateField(_("Data"))
    source = models.CharField(_("Origem L2"), max_length=255)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        on_delete=models.SET_NULL,
        verbose_name=_("Criado por"),
    )
    total_characters = models.PositiveBigIntegerField(_("Personagens"), default=0)
    total_instances = models.PositiveBigIntegerField(_("Stacks L2"), default=0)
    total_quantity = models.DecimalField(_("Quantidade L2"), max_digits=30, decimal_places=0, default=0)
    site_quantity = models.DecimalField(_("Quantidade no painel"), max_digits=30, decimal_places=0, default=0)
    notes = models.TextField(_("Notas"), blank=True, max_length=2000)

    class Meta:
        verbose_name = _("Snapshot de itens")
        verbose_name_plural = _("Snapshots de itens")
        ordering = ["-snapshot_date", "-created_at"]
        constraints = [models.UniqueConstraint(fields=["source", "snapshot_date"], name="unique_item_snapshot_day")]
        permissions = [("capture_itemobservationsnapshot", _("Pode capturar snapshot dos itens L2"))]

    def __str__(self):
        return f"{self.snapshot_date} — {self.source}"


class ItemObservationDetail(BaseModel):
    """Detalhe de um item ou agrupamento armazenado em uma captura de observação.

    Relaciona os registros por ``snapshot``. Herda BaseModel: use ``id`` (UUID) nas APIs;
    ``pk``/``seq_id`` são internos. Use os serviços de aplicação para operações de negócio,
    mantendo neste modelo as regras de persistência e os relacionamentos.
    """

    snapshot = models.ForeignKey(ItemObservationSnapshot, on_delete=models.CASCADE, related_name="details")
    item_id = models.PositiveIntegerField()
    item_name = models.CharField(max_length=255)
    location = models.CharField(max_length=24)
    quantity = models.DecimalField(max_digits=30, decimal_places=0)
    instances = models.PositiveBigIntegerField()
    unique_owners = models.PositiveBigIntegerField()
    category_name = models.CharField(max_length=100, blank=True)

    class Meta:
        verbose_name = _("Detalhe de observação")
        verbose_name_plural = _("Detalhes de observação")
        constraints = [models.UniqueConstraint(fields=["snapshot", "item_id", "location"],
                                               name="unique_item_snapshot_location")]
        ordering = ["-quantity", "item_id", "location"]


class ItemObservationFavorite(BaseModel):
    """Item acompanhado pela equipe na área de observação.

    Relaciona os registros por ``user``. Herda BaseModel: use ``id`` (UUID) nas APIs;
    ``pk``/``seq_id`` são internos. Use os serviços de aplicação para operações de negócio,
    mantendo neste modelo as regras de persistência e os relacionamentos.
    """

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    source = models.CharField(max_length=255)
    item_id = models.PositiveIntegerField()

    class Meta:
        verbose_name = _("Favorito de observação")
        verbose_name_plural = _("Favoritos de observação")
        constraints = [models.UniqueConstraint(fields=["user", "source", "item_id"], name="unique_item_favorite")]
