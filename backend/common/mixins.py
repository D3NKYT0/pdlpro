"""Mixins para padronizar UUID em serializers e views."""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from rest_framework import generics, serializers

    _SerializerBase = serializers.Serializer
    _ViewBase = generics.GenericAPIView[Any]
else:
    _SerializerBase = object
    _ViewBase = object


class UUIDPublicFieldsMixin(_SerializerBase):
    """Remove seq_id e _seq_id da entrada e da saída de serializers DRF.

    Declare o mixin antes de ``Serializer`` ou ``ModelSerializer`` na herança. Também converte
    valores UUID do primeiro nível da representação em texto. Não filtra recursivamente
    estruturas aninhadas; aplique o contrato nos serializers filhos e escolha explicitamente os
    campos públicos.
    """

    FORBIDDEN_FIELDS = frozenset({"seq_id", "_seq_id"})

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field_name in list(self.fields.keys()):
            if field_name in self.FORBIDDEN_FIELDS:
                self.fields.pop(field_name)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        for field in self.FORBIDDEN_FIELDS:
            data.pop(field, None)
        for field_name, value in data.items():
            if isinstance(value, uuid.UUID):
                data[field_name] = str(value)
        return data


class UUIDLookupMixin(_ViewBase):
    """Configura buscas de views genéricas pelo campo público id (UUID).

    Use antes da base DRF na herança; por padrão lê o parâmetro de URL ``pk`` e consulta
    ``lookup_field = 'id'``. Um valor malformado gera ValidationError com código not_found; a
    busca válida é delegada a ``super().get_object()``.
    """

    lookup_field = "id"
    lookup_url_kwarg = "pk"

    def get_object(self):
        pk = self.kwargs.get(self.lookup_url_kwarg or self.lookup_field)
        try:
            uuid.UUID(str(pk))
        except (ValueError, AttributeError):
            from rest_framework.exceptions import ValidationError

            raise ValidationError({"detail": "recurso não encontrado"}, code="not_found")
        return super().get_object()
