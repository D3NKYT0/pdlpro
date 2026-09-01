from rest_framework import serializers

from apps.accounts.domain.entities import UserEntity
from common.mixins import UUIDPublicFieldsMixin
from common.validators import validate_ascii_username


class UserPublicSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    username = serializers.CharField()
    display_name = serializers.CharField()
    role = serializers.CharField()
    is_email_verified = serializers.BooleanField()
    fichas = serializers.IntegerField()
    avatar_url = serializers.CharField(allow_null=True)


class UserSerializer(UUIDPublicFieldsMixin, serializers.Serializer):
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
    username = serializers.CharField(max_length=16, validators=[validate_ascii_username])
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    display_name = serializers.CharField(required=False, allow_blank=True, max_length=80)
    accept_terms = serializers.BooleanField()
    hcaptcha_token = serializers.CharField(required=False, allow_blank=True, write_only=True)


class LoginSerializer(serializers.Serializer):
    login = serializers.CharField()
    password = serializers.CharField(write_only=True)
    hcaptcha_token = serializers.CharField(required=False, allow_blank=True, write_only=True)


class UpdateProfileSerializer(serializers.Serializer):
    display_name = serializers.CharField(required=False, allow_blank=True, max_length=80)
    bio = serializers.CharField(required=False, allow_blank=True, max_length=500)
    avatar = serializers.ImageField(required=False)


class PasskeyCredentialSerializer(serializers.ModelSerializer):
    class Meta:
        from apps.accounts.infrastructure.models import WebAuthnCredential

        model = WebAuthnCredential
        fields = ["id", "nickname", "created_at", "last_used_at"]
        read_only_fields = fields


class PasskeyBeginSerializer(serializers.Serializer):
    login = serializers.CharField(required=False, allow_blank=True)
    nickname = serializers.CharField(required=False, allow_blank=True, max_length=64)


class PasskeyCompleteSerializer(serializers.Serializer):
    state = serializers.CharField(max_length=128)
    credential = serializers.JSONField()
    nickname = serializers.CharField(required=False, allow_blank=True, max_length=64)


class OAuthBeginSerializer(serializers.Serializer):
    provider = serializers.ChoiceField(choices=["google", "discord"])
    mode = serializers.ChoiceField(choices=["login", "link"], default="login")


class OAuthCompleteSerializer(serializers.Serializer):
    provider = serializers.ChoiceField(choices=["google", "discord"])
    code = serializers.CharField()
    state = serializers.CharField()
