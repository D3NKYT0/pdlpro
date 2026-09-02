from decimal import Decimal

from django.db import models

from common.models import BaseModel


class ShopItem(BaseModel):
    """Produto individual da loja que associa um tipo de item a preço e quantidade entregue. Herda
    BaseModel: use ``id`` (UUID) nas APIs; ``pk``/``seq_id`` são internos. Use os serviços de
    aplicação para operações de negócio, mantendo neste modelo as regras de persistência e os
    relacionamentos.
    """

    name = models.CharField(max_length=100)
    item_id = models.PositiveIntegerField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField(default=1)
    active = models.BooleanField(default=True)
    image = models.ImageField(upload_to="shop/", null=True, blank=True)

    class Meta:
        verbose_name = "Item da loja"
        verbose_name_plural = "Itens da loja"

    def __str__(self) -> str:
        return self.name


class ShopPackage(BaseModel):
    """Pacote de produtos ofertado pela loja. Herda BaseModel: use ``id`` (UUID) nas APIs;
    ``pk``/``seq_id`` são internos. Use os serviços de aplicação para operações de negócio,
    mantendo neste modelo as regras de persistência e os relacionamentos.
    """

    name = models.CharField(max_length=100)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Pacote"
        verbose_name_plural = "Pacotes"


class ShopPackageItem(BaseModel):
    """Composição de um pacote da loja com suas quantidades de itens.

    Relaciona os registros por ``package``, ``item``. Herda BaseModel: use ``id`` (UUID) nas
    APIs; ``pk``/``seq_id`` são internos. Use os serviços de aplicação para operações de
    negócio, mantendo neste modelo as regras de persistência e os relacionamentos.
    """

    package = models.ForeignKey(ShopPackage, on_delete=models.CASCADE, related_name="package_items")
    item = models.ForeignKey(ShopItem, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)


class Cart(BaseModel):
    """Carrinho do usuário que agrupa os produtos e opções da próxima compra.

    Relaciona os registros por ``user``. Herda BaseModel: use ``id`` (UUID) nas APIs;
    ``pk``/``seq_id`` são internos. Use os serviços de aplicação para operações de negócio,
    mantendo neste modelo as regras de persistência e os relacionamentos.
    """

    user = models.OneToOneField("accounts.User", on_delete=models.CASCADE, related_name="cart")
    promo_code = models.CharField(max_length=40, blank=True)
    use_bonus = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Carrinho"
        verbose_name_plural = "Carrinhos"


class CartItem(BaseModel):
    """Linha de produto individual e quantidade selecionada em um carrinho.

    Relaciona os registros por ``cart``, ``item``. Herda BaseModel: use ``id`` (UUID) nas APIs;
    ``pk``/``seq_id`` são internos. Use os serviços de aplicação para operações de negócio,
    mantendo neste modelo as regras de persistência e os relacionamentos.
    """

    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name="items")
    item = models.ForeignKey(ShopItem, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)


class ShopPurchase(BaseModel):
    """Histórico persistido de uma compra concluída na loja.

    Relaciona os registros por ``user``. Herda BaseModel: use ``id`` (UUID) nas APIs;
    ``pk``/``seq_id`` são internos. Use os serviços de aplicação para operações de negócio,
    mantendo neste modelo as regras de persistência e os relacionamentos.
    """

    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="purchases")
    total = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    status = models.CharField(max_length=20, default="completed")
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    bonus_used = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    promo_code = models.CharField(max_length=40, blank=True)
    items_snapshot = models.JSONField(default=list)
    request_key = models.UUIDField(null=True, blank=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["user", "request_key"], name="shop_checkout_idempotency")]


class CartPackage(BaseModel):
    """Linha de pacote selecionado para compra em um carrinho.

    Relaciona os registros por ``cart``, ``package``. Herda BaseModel: use ``id`` (UUID) nas
    APIs; ``pk``/``seq_id`` são internos. Use os serviços de aplicação para operações de
    negócio, mantendo neste modelo as regras de persistência e os relacionamentos.
    """

    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name="packages")
    package = models.ForeignKey(ShopPackage, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["cart", "package"], name="cart_unique_package")]


class PromotionCode(BaseModel):
    """Código promocional e condições de aplicação de desconto no comércio.

    Relaciona os registros por ``supporter``. Herda BaseModel: use ``id`` (UUID) nas APIs;
    ``pk``/``seq_id`` são internos. Use os serviços de aplicação para operações de negócio,
    mantendo neste modelo as regras de persistência e os relacionamentos.
    """

    code = models.CharField(max_length=40, unique=True)
    percent = models.DecimalField(max_digits=5, decimal_places=2)
    active = models.BooleanField(default=True)
    starts_at = models.DateTimeField(null=True, blank=True)
    ends_at = models.DateTimeField(null=True, blank=True)
    max_uses = models.PositiveIntegerField(default=0)
    uses = models.PositiveIntegerField(default=0)
    supporter = models.ForeignKey("programs.Supporter", on_delete=models.SET_NULL, null=True, blank=True)

    def save(self, *args, **kwargs):
        self.code = self.code.strip().upper()
        super().save(*args, **kwargs)
