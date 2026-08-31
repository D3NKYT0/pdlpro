import uuid
from typing import ClassVar

from django.conf import settings
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models

from common.models import BaseModel
from common.validators import validate_ascii_username


class UserManager(BaseUserManager["User"]):
    def create_user(self, username, email, password=None, **extra_fields):
        if not username:
            raise ValueError("Username é obrigatório")
        if not email:
            raise ValueError("Email é obrigatório")
        email = self.normalize_email(email)
        user = self.model(username=username, email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", User.Role.ADMIN)
        extra_fields.setdefault("is_email_verified", True)
        return self.create_user(username, email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    class Role(models.TextChoices):
        PLAYER = "player", "Jogador"
        SUPPORTER = "supporter", "Apoiador"
        MODERATOR = "moderator", "Moderador"
        STAFF = "staff", "Equipe"
        ADMIN = "admin", "Administrador"

    id = models.UUIDField(unique=True, default=uuid.uuid4, editable=False)
    seq_id = models.BigAutoField(primary_key=True, editable=False)
    username = models.CharField(
        max_length=16,
        unique=True,
        validators=[validate_ascii_username],
    )
    email = models.EmailField(unique=True, db_index=True)
    display_name = models.CharField(max_length=80, blank=True)
    bio = models.TextField(max_length=500, blank=True)
    avatar = models.ImageField(upload_to="avatars/", null=True, blank=True)
    role = models.CharField(max_length=16, choices=Role.choices, default=Role.PLAYER)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_email_verified = models.BooleanField(default=False)
    is_2fa_enabled = models.BooleanField(default=False)
    totp_secret = models.CharField(max_length=32, blank=True, default="")
    fichas = models.PositiveIntegerField(default=0)
    terms_accepted_at = models.DateTimeField(null=True, blank=True)
    terms_and_privacy_version = models.CharField(max_length=64, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = "username"
    REQUIRED_FIELDS: ClassVar[list[str]] = ["email"]
    objects: ClassVar[UserManager] = UserManager()

    class Meta:
        verbose_name = "Usuário"
        verbose_name_plural = "Usuários"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.username

    def get_full_name(self) -> str:
        return self.display_name or self.username

    def get_short_name(self) -> str:
        return self.username

    @property
    def is_staff_member(self) -> bool:
        return self.role in {self.Role.STAFF, self.Role.ADMIN, self.Role.MODERATOR} or self.is_staff


class GamerProfile(BaseModel):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="gamer_profile")
    xp = models.PositiveIntegerField(default=0)
    level = models.PositiveIntegerField(default=1)

    class Meta:
        verbose_name = "Perfil gamer"


class Achievement(BaseModel):
    code = models.CharField(max_length=40, unique=True)
    name = models.CharField(max_length=80)
    description = models.CharField(max_length=200, blank=True)

    class Meta:
        verbose_name = "Conquista"


class UserAchievement(BaseModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="achievements")
    achievement = models.ForeignKey(Achievement, on_delete=models.CASCADE, related_name="unlocks")

    class Meta:
        verbose_name = "Conquista do jogador"
        unique_together = ("user", "achievement")


class RewardDefinition(BaseModel):
    class Kind(models.TextChoices):
        LEVEL = "level", "Nível"
        ACHIEVEMENT = "achievement", "Conquista"

    kind = models.CharField(max_length=20, choices=Kind.choices)
    reference = models.CharField(max_length=40)
    item_id = models.PositiveIntegerField(default=57)
    item_name = models.CharField(max_length=120, default="Adena")
    enchant = models.PositiveIntegerField(default=0)
    quantity = models.PositiveIntegerField(default=1)
    description = models.CharField(max_length=200, blank=True)

    class Meta:
        verbose_name = "Recompensa"


class RewardClaim(BaseModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reward_claims")
    reward = models.ForeignKey(RewardDefinition, on_delete=models.CASCADE, related_name="claims")

    class Meta:
        verbose_name = "Recompensa resgatada"
        unique_together = ("user", "reward")
