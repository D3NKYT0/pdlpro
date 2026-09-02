import uuid
from typing import ClassVar

from django.conf import settings
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models

from common.models import BaseModel
from common.validators import validate_ascii_username


class UserManager(BaseUserManager["User"]):
    """Manager do modelo de usuário com criação de contas e superusuários.

    Prefira ``create_user`` e ``create_superuser`` a atribuir a senha diretamente ao modelo:
    esses métodos aplicam a preparação da conta e o hash de senha. O fluxo público de cadastro
    deve passar por RegisterUserUseCase para registrar também aceite legal e verificação de
    e-mail.
    """

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
    """Conta de acesso ao painel, com autenticação, papéis, 2FA, fichas e aceite legal. Use os
    serviços de aplicação para operações de negócio, mantendo neste modelo as regras de
    persistência e os relacionamentos.
    """

    class Role(models.TextChoices):
        """Valores aceitos para Role em User.

        Use as constantes desta enumeração ao atribuir o campo; o primeiro valor de cada opção é
        persistido e o rótulo é usado na apresentação.
        """

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
    """Progresso de XP e nível do usuário no painel.

    Relaciona os registros por ``user``. Herda BaseModel: use ``id`` (UUID) nas APIs;
    ``pk``/``seq_id`` são internos. Use os serviços de aplicação para operações de negócio,
    mantendo neste modelo as regras de persistência e os relacionamentos.
    """

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="gamer_profile")
    xp = models.PositiveIntegerField(default=0)
    level = models.PositiveIntegerField(default=1)

    class Meta:
        verbose_name = "Perfil gamer"


class WebAuthnCredential(BaseModel):
    """Credencial pública de passkey registrada por um usuário para autenticação WebAuthn.

    Relaciona os registros por ``user``. Herda BaseModel: use ``id`` (UUID) nas APIs;
    ``pk``/``seq_id`` são internos. Use os serviços de aplicação para operações de negócio,
    mantendo neste modelo as regras de persistência e os relacionamentos.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="webauthn_credentials",
    )
    credential_id = models.BinaryField(unique=True)
    public_key = models.BinaryField()
    sign_count = models.PositiveBigIntegerField(default=0)
    transports = models.JSONField(default=list, blank=True)
    aaguid = models.CharField(max_length=36, blank=True, default="")
    nickname = models.CharField(max_length=64, blank=True, default="")
    last_used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Chave de acesso"
        verbose_name_plural = "Chaves de acesso"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["user", "created_at"], name="pdl_webauthn_user_created")]


class Achievement(BaseModel):
    """Definição de uma conquista que pode ser desbloqueada pelo jogador. Herda BaseModel: use
    ``id`` (UUID) nas APIs; ``pk``/``seq_id`` são internos. Use os serviços de aplicação para
    operações de negócio, mantendo neste modelo as regras de persistência e os relacionamentos.
    """

    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=80)
    description = models.CharField(max_length=200, blank=True)

    class Meta:
        verbose_name = "Conquista"


class UserAchievement(BaseModel):
    """Registro de uma conquista já desbloqueada por um usuário.

    Relaciona os registros por ``user``, ``achievement``. Herda BaseModel: use ``id`` (UUID) nas
    APIs; ``pk``/``seq_id`` são internos. Use os serviços de aplicação para operações de
    negócio, mantendo neste modelo as regras de persistência e os relacionamentos.
    """

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="achievements")
    achievement = models.ForeignKey(Achievement, on_delete=models.CASCADE, related_name="unlocks")

    class Meta:
        verbose_name = "Conquista do jogador"
        unique_together = ("user", "achievement")


class RewardDefinition(BaseModel):
    """Prêmio resgatável por nível ou conquista, com item e quantidade de entrega. Herda BaseModel:
    use ``id`` (UUID) nas APIs; ``pk``/``seq_id`` são internos. Use os serviços de aplicação
    para operações de negócio, mantendo neste modelo as regras de persistência e os
    relacionamentos.
    """

    class Kind(models.TextChoices):
        """Valores aceitos para Kind em RewardDefinition.

        Use as constantes desta enumeração ao atribuir o campo; o primeiro valor de cada opção é
        persistido e o rótulo é usado na apresentação.
        """

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
    """Registro de que um usuário já resgatou uma recompensa definida.

    Relaciona os registros por ``user``, ``reward``. Herda BaseModel: use ``id`` (UUID) nas
    APIs; ``pk``/``seq_id`` são internos. Use os serviços de aplicação para operações de
    negócio, mantendo neste modelo as regras de persistência e os relacionamentos.
    """

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reward_claims")
    reward = models.ForeignKey(RewardDefinition, on_delete=models.CASCADE, related_name="claims")

    class Meta:
        verbose_name = "Recompensa resgatada"
        unique_together = ("user", "reward")
