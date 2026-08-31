from django.core.exceptions import ValidationError


def validate_ascii_username(value: str) -> None:
    if not value or not value.isalnum():
        raise ValidationError("Use apenas letras e números, sem espaços ou símbolos.")
    if len(value) < 3 or len(value) > 16:
        raise ValidationError("O nome de usuário deve ter entre 3 e 16 caracteres.")
