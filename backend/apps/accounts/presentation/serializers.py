from rest_framework import serializers

from apps.accounts.domain.entities import UserEntity
from common.mixins import UUIDPublicFieldsMixin
from common.validators import validate_ascii_username


class UserPublicSerializer(serializers.Serializer):
    """Representa os campos públicos do usuário, incluindo progresso e avatar.

    Use ``Serializer(instancia).data`` (com o nome desta classe) para representar a saída;
    ``many=True`` representa uma coleção.

    Campos declarados: ``id``, ``username``, ``display_name``, ``role``, ``is_email_verified``,
    ``fichas``, ``avatar_url``.
    """

    id = serializers.UUIDField()
    username = serializers.CharField()
    display_name = serializers.CharField()
    role = serializers.CharField()
    is_email_verified = serializers.BooleanField()
    fichas = serializers.IntegerField()
    avatar_url = serializers.CharField(allow_null=True)


class UserSerializer(UUIDPublicFieldsMixin, serializers.Serializer):
    """Representa o usuário da sessão a partir de UserEntity ou do modelo ORM. Normaliza avatar_url
    e indicadores de permissão sem expor a chave sequencial.

    Use ``Serializer(instancia).data`` (com o nome desta classe) para representar a saída;
    ``many=True`` representa uma coleção.

    Campos declarados: ``id``, ``username``, ``email``, ``display_name``, ``role``,
    ``is_email_verified``, ``fichas``, ``is_2fa_enabled``, ``is_staff``, ``is_superuser``,
    ``is_staff_member``, ``has_usable_password``, ``avatar``, ``bio``,
    ``terms_accepted_at``, ``terms_and_privacy_version``, ``current_legal_docs_version``,
    ``needs_terms_acceptance``.
    """

    id = serializers.UUIDField(read_only=True)
    username = serializers.CharField(read_only=True)
    email = serializers.EmailField(read_only=True)
    display_name = serializers.CharField()
    role = serializers.CharField(read_only=True)
    is_email_verified = serializers.BooleanField(read_only=True)
    fichas = serializers.IntegerField(read_only=True)
    is_2fa_enabled = serializers.BooleanField(read_only=True)
    is_staff = serializers.BooleanField(read_only=True)
    is_superuser = serializers.BooleanField(read_only=True)
    is_staff_member = serializers.BooleanField(read_only=True)
    has_usable_password = serializers.BooleanField(read_only=True)
    avatar = serializers.ImageField(read_only=True, allow_null=True)
    bio = serializers.CharField(required=False, allow_blank=True)
    terms_accepted_at = serializers.CharField(read_only=True, allow_null=True, required=False)
    terms_and_privacy_version = serializers.CharField(read_only=True, required=False)
    current_legal_docs_version = serializers.CharField(read_only=True, required=False)
    needs_terms_acceptance = serializers.BooleanField(read_only=True, required=False)

    def to_representation(self, instance):
        from datetime import datetime

        from apps.accounts.application.terms_consent import (
            current_legal_docs_version,
            user_needs_terms_acceptance,
        )

        if isinstance(instance, UserEntity):
            accepted_at = instance.terms_accepted_at
            version = instance.terms_and_privacy_version or ""
            parsed_accepted = None
            if accepted_at:
                try:
                    parsed_accepted = datetime.fromisoformat(accepted_at)
                except ValueError:
                    parsed_accepted = None
            return {
                "id": str(instance.id),
                "username": instance.username,
                "email": instance.email,
                "display_name": instance.display_name,
                "bio": instance.bio,
                "role": instance.role,
                "is_email_verified": instance.is_email_verified,
                "fichas": instance.fichas,
                "avatar_url": instance.avatar_url,
                "is_2fa_enabled": instance.is_2fa_enabled,
                "is_staff": instance.is_staff,
                "is_superuser": instance.is_superuser,
                "is_staff_member": instance.is_staff_member,
                "has_usable_password": instance.has_usable_password,
                "terms_accepted_at": accepted_at,
                "terms_and_privacy_version": version,
                "current_legal_docs_version": current_legal_docs_version(),
                "needs_terms_acceptance": user_needs_terms_acceptance(
                    terms_accepted_at=parsed_accepted,
                    terms_and_privacy_version=version,
                ),
            }
        data = super().to_representation(instance)
        data["avatar_url"] = instance.avatar.url if getattr(instance, "avatar", None) else None
        data["is_staff"] = bool(getattr(instance, "is_staff", False))
        data["is_superuser"] = bool(getattr(instance, "is_superuser", False))
        data["is_staff_member"] = bool(getattr(instance, "is_staff_member", False))
        data["has_usable_password"] = bool(instance.has_usable_password())
        accepted_at = instance.terms_accepted_at
        version = getattr(instance, "terms_and_privacy_version", "") or ""
        data["terms_accepted_at"] = accepted_at.isoformat() if accepted_at else None
        data["terms_and_privacy_version"] = version
        data["current_legal_docs_version"] = current_legal_docs_version()
        data["needs_terms_acceptance"] = user_needs_terms_acceptance(
            terms_accepted_at=accepted_at,
            terms_and_privacy_version=version,
        )
        data.pop("avatar", None)
        return data


class AcceptTermsSerializer(serializers.Serializer):
    """Payload de reaceitação dos documentos legais vigentes.

    Campos declarados: ``terms_accepted``.
    """

    terms_accepted = serializers.BooleanField()


class RegisterSerializer(serializers.Serializer):
    """Valida os dados do cadastro público, incluindo senha, aceite legal e token de captcha.

    Instancie com ``data=payload`` e chame ``is_valid(raise_exception=True)`` antes de consumir
    validated_data. A autorização pertence ao fluxo chamador.

    Campos declarados: ``username``, ``email``, ``password``, ``display_name``,
    ``accept_terms``, ``hcaptcha_token``.
    """

    username = serializers.CharField(max_length=16, validators=[validate_ascii_username])
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    display_name = serializers.CharField(required=False, allow_blank=True, max_length=80)
    accept_terms = serializers.BooleanField()
    hcaptcha_token = serializers.CharField(required=False, allow_blank=True, write_only=True)


class LoginSerializer(serializers.Serializer):
    """Valida o formato das credenciais de login; a conferência de senha ocorre na aplicação.

    Instancie com ``data=payload`` e chame ``is_valid(raise_exception=True)`` antes de consumir
    validated_data. A autorização pertence ao fluxo chamador.

    Campos declarados: ``login``, ``password``, ``hcaptcha_token``.
    """

    login = serializers.CharField()
    password = serializers.CharField(write_only=True)
    hcaptcha_token = serializers.CharField(required=False, allow_blank=True, write_only=True)


class UpdateProfileSerializer(serializers.Serializer):
    """Valida os campos editáveis do perfil e o upload opcional de avatar.

    Instancie com ``data=payload`` e chame ``is_valid(raise_exception=True)`` antes de consumir
    validated_data. A autorização pertence ao fluxo chamador.

    Campos declarados: ``display_name``, ``bio``, ``avatar``.
    """

    display_name = serializers.CharField(required=False, allow_blank=True, max_length=80)
    bio = serializers.CharField(required=False, allow_blank=True, max_length=500)
    avatar = serializers.ImageField(required=False)


class PasskeyCredentialSerializer(serializers.Serializer):
    """Representa os metadados de uma passkey do usuário, sem expor a chave da credencial.

    Aceita o modelo ORM ou ``WebAuthnCredentialRecord``. Use ``Serializer(instancia).data``
    (com o nome desta classe) para representar a saída; ``many=True`` representa uma coleção.

    Campos declarados: ``id``, ``nickname``, ``created_at``, ``last_used_at``.
    """

    id = serializers.UUIDField()
    nickname = serializers.CharField(allow_blank=True)
    created_at = serializers.DateTimeField(allow_null=True)
    last_used_at = serializers.DateTimeField(allow_null=True)


class PasskeyBeginSerializer(serializers.Serializer):
    """Valida os parâmetros para iniciar um desafio de passkey.

    Instancie com ``data=payload`` e chame ``is_valid(raise_exception=True)`` antes de consumir
    validated_data. A autorização pertence ao fluxo chamador.

    Campos declarados: ``login``, ``nickname``.
    """

    login = serializers.CharField(required=False, allow_blank=True)
    nickname = serializers.CharField(required=False, allow_blank=True, max_length=64)


class PasskeyCompleteSerializer(serializers.Serializer):
    """Valida o envelope da resposta WebAuthn; a prova criptográfica é conferida pelo serviço de
    passkeys.

    Instancie com ``data=payload`` e chame ``is_valid(raise_exception=True)`` antes de consumir
    validated_data. A autorização pertence ao fluxo chamador.

    Campos declarados: ``state``, ``credential``, ``nickname``.
    """

    state = serializers.CharField(max_length=128)
    credential = serializers.JSONField()
    nickname = serializers.CharField(required=False, allow_blank=True, max_length=64)


class OAuthBeginSerializer(serializers.Serializer):
    """Valida os parâmetros usados para iniciar autenticação social.

    Instancie com ``data=payload`` e chame ``is_valid(raise_exception=True)`` antes de consumir
    validated_data. A autorização pertence ao fluxo chamador.

    Campos declarados: ``provider``, ``mode``.
    """

    provider = serializers.ChoiceField(choices=["google", "discord"])
    mode = serializers.ChoiceField(choices=["login", "link"], default="login")


class OAuthCompleteSerializer(serializers.Serializer):
    """Valida o retorno do provedor social antes de concluir a autenticação.

    Instancie com ``data=payload`` e chame ``is_valid(raise_exception=True)`` antes de consumir
    validated_data. A autorização pertence ao fluxo chamador.

    Campos declarados: ``provider``, ``code``, ``state``.
    """

    provider = serializers.ChoiceField(choices=["google", "discord"])
    code = serializers.CharField()
    state = serializers.CharField()


class CompleteCredentialsSerializer(serializers.Serializer):
    """Valida login, senha e aceite legal para concluir o cadastro após OAuth.

    Instancie com ``data=payload`` e chame ``is_valid(raise_exception=True)`` antes de consumir
    validated_data. A autorização pertence ao fluxo chamador.

    Campos declarados: ``username``, ``password``, ``accept_terms``.
    """

    username = serializers.CharField(max_length=16, validators=[validate_ascii_username])
    password = serializers.CharField(write_only=True, min_length=8)
    accept_terms = serializers.BooleanField()


class AuthSessionSerializer(serializers.Serializer):
    """Representa uma sessão de refresh ativa do usuário autenticado.

    Use ``Serializer(instancia).data`` (com o nome desta classe) para representar a saída;
    ``many=True`` representa uma coleção.

    Campos declarados: ``id``, ``created_at``, ``expires_at``, ``current``.
    """

    id = serializers.CharField()
    created_at = serializers.DateTimeField(allow_null=True)
    expires_at = serializers.DateTimeField()
    current = serializers.BooleanField()
