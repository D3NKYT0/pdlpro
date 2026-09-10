from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _


def validate_ascii_username(value: str) -> None:
    """Valida um nome alfanumérico com comprimento de 3 a 16 caracteres.

    Lança ValidationError do Django para valores inválidos. Apesar do nome histórico, usa
    str.isalnum(), que também aceita letras e números Unicode; não garante que a entrada
    contenha apenas ASCII.
    """

    if not value or not value.isalnum():
        raise ValidationError(_("Use apenas letras e números, sem espaços ou símbolos."))
    if len(value) < 3 or len(value) > 16:
        raise ValidationError(_("O nome de usuário deve ter entre 3 e 16 caracteres."))
