"""Exclusão administrativa que preserva referências a outros cadastros."""

from django.db import transaction
from django.db.models.deletion import ProtectedError, RestrictedError
from django.utils.translation import gettext_noop

from common.architecture.exceptions import ValidationDomainError

DEPENDENCY_MESSAGE = gettext_noop("Este registro possui vínculos. Remova os vínculos ou desative o registro.")


def delete_unreferenced(model, entry_id, *, owned_relations=()):
    """Bloqueia referências externas e remove o registro sob transação e lock.

    Relações explicitamente pertencentes ao agregado podem acompanhar sua exclusão.
    Retorna False para um identificador já removido; nenhum histórico é apagado.
    """
    try:
        with transaction.atomic():
            row = model.objects.select_for_update().filter(id=entry_id).first()
            if row is None:
                return False
            for relation in model._meta.related_objects:
                if relation.get_accessor_name() in owned_relations:
                    continue
                if relation.related_model.objects.filter(**{relation.field.name: row}).exists():
                    raise ValidationDomainError(DEPENDENCY_MESSAGE)
            row.delete()
            return True
    except (ProtectedError, RestrictedError) as exc:
        raise ValidationDomainError(DEPENDENCY_MESSAGE) from exc
