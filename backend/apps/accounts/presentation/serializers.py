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
    ``is_staff_member``, ``avatar``, ``bio``.
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
    avatar = serializers.ImageField(read_only=True, allow_null=True)
    bio = serializers.CharField(required=False, allow_blank=True)

    def to_representation(self, instance):
        if isinstance(instance, UserEntity):
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
            }
        data = super().to_representation(instance)
        data["avatar_url"] = instance.avatar.url if getattr(instance, "avatar", None) else None
        data["is_staff"] = bool(getattr(instance, "is_staff", False))
        data["is_superuser"] = bool(getattr(instance, "is_superuser", False))
        data["is_staff_member"] = bool(getattr(instance, "is_staff_member", False))
        data.pop("avatar", None)
        return data


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


class PasskeyCredentialSerializer(serializers.ModelSerializer):
    """Representa os metadados de uma passkey do usuário, sem expor a chave da credencial.

    Use ``Serializer(instancia).data`` (com o nome desta classe) para representar a saída;
    ``many=True`` representa uma coleção.

    Campos declarados: ``id``, ``nickname``, ``created_at``, ``last_used_at``.
    """

    class Meta:
        from apps.accounts.infrastructure.models import WebAuthnCredential

        model = WebAuthnCredential
        fields = ["id", "nickname", "created_at", "last_used_at"]
        read_only_fields = fields


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
