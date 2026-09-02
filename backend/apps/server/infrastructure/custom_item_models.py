import json
from uuid import uuid4

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models

from common.models import BaseModel


ITEM_CATEGORIES = [(key, label) for key, label in (
    ("COMUM", "Comum"), ("WEAPON", "Arma"), ("SHIELD", "Escudo"), ("HELMET", "Elmo"),
    ("ARMOR", "Armadura"), ("PANTS", "Calça"), ("BOOTS", "Botas"), ("GLOVES", "Luvas"),
    ("NECKLACE", "Colar"), ("EARRING", "Brinco"), ("RING", "Anel"), ("HAIR", "Acessório"),
    ("FACE", "Máscara"), ("UNDERWEAR", "Roupa íntima"), ("FORMAL", "Traje"), ("PET", "Pet"),
)]
ITEM_GRADES = [(grade, grade) for grade in ("NG", "D", "C", "B", "A", "S")]


def custom_item_image_path(instance, filename):
    return f"custom-items/{instance.item_id}/{uuid4().hex}.png"


def validate_custom_metadata(value):
    if not isinstance(value, dict):
        raise ValidationError("Os metadados devem ser um objeto JSON.")
    try:
        size = len(json.dumps(value, ensure_ascii=False, allow_nan=False).encode("utf-8"))
    except (TypeError, ValueError, RecursionError):
        raise ValidationError("Metadados JSON inválidos.") from None
    if size > 16384:
        raise ValidationError("Metadados limitados a 16 KB.")


class CustomCatalogItem(BaseModel):
    item_id = models.PositiveIntegerField("ID no jogo", unique=True,
        validators=[MinValueValidator(1), MaxValueValidator(2147483647)])
    name = models.CharField("Nome", max_length=255)
    image = models.ImageField("Imagem", upload_to=custom_item_image_path)
    category = models.CharField("Tipo", max_length=24, choices=ITEM_CATEGORIES, default="COMUM")
    grade = models.CharField("Grau", max_length=2, choices=ITEM_GRADES, default="NG")
    tradeable = models.BooleanField("Negociável", default=True)
    metadata = models.JSONField("Metadados públicos", default=dict, blank=True, validators=[validate_custom_metadata])
    active = models.BooleanField("Ativo", default=True)

    class Meta:
        ordering = ["item_id"]
        verbose_name = "Item customizado"
        verbose_name_plural = "Itens customizados"

    def __str__(self):
        return f"{self.item_id} — {self.name}"
