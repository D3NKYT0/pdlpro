import uuid

from django.db import models


class BaseModel(models.Model):
    """Modelo abstrato para recursos do painel com identificador público UUID.

    ``id`` é o UUID exposto na API; ``seq_id`` é a chave primária sequencial interna. Assim,
    ``obj.pk`` corresponde a ``seq_id``, não ao UUID: consulte recursos públicos com
    ``filter(id=uuid)``. Inclui datas de criação e edição e ordenação decrescente de criação.
    Subclasses geram suas próprias tabelas.
    """

    id = models.UUIDField(
        unique=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Identificador público. Sempre UUID v4.",
    )
    seq_id = models.BigAutoField(
        primary_key=True,
        editable=False,
        help_text="ID sequencial interno. Nunca expor via API.",
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ["-created_at"]


class InternalModel(models.Model):
    """Modelo abstrato com datas de criação e edição para dados internos.

    Use para registros que não precisam do UUID público de ``BaseModel``. Não adiciona
    explicitamente ``id`` ou ``seq_id``; a chave primária segue a definição da subclasse e os
    padrões do Django.
    """

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ["-created_at"]
