from __future__ import annotations

from decimal import Decimal

from django.conf import settings
from django.utils.text import slugify

from apps.content.domain.repositories import INewsAdminRepository
from apps.games.domain.repositories import IGameConfigAdminRepository
from apps.server.application.use_cases import GetServerInfoUseCase
from apps.server.domain.item_catalog import IItemDisplayName
from apps.server.domain.repositories import (
    IIndexConfigRepository,
    IServicePriceRepository,
)
from apps.shop.domain.repositories import IShopItemAdminRepository
from apps.wallet.domain.repositories import ICoinAdminRepository
from common.architecture.base import UseCase
from common.architecture.exceptions import EntityNotFoundError, ValidationDomainError

DEFAULT_SERVICES = (
    ("CHANGE_NICKNAME", "Troca de nickname", Decimal("10.00")),
    ("CHANGE_SEX", "Troca de sexo", Decimal("10.00")),
    ("LINK_SLOT", "Slot extra de conta", Decimal("10.00")),
    ("UNSTUCK", "Destravar personagem", Decimal("0.00")),
)


def _panel_defaults(server_info: GetServerInfoUseCase, index_config: IIndexConfigRepository) -> dict:
    info = server_info.execute()
    row = index_config.get_active()
    return {
        "id": str(row.id) if row else None,
        "slogan": row.slogan if row else str(getattr(settings, "PROJECT_TITLE", "PDL PRO")),
        "name": info.name,
        "description": info.description,
        "chronicle": info.chronicle,
        "rates": info.rates,
        "enchant": info.enchant,
        "max_level": info.max_level,
        "features": info.features,
        "notes": info.notes,
        "coming_soon": bool(row.coming_soon) if row else False,
        "staff_only_login": bool(row.staff_only_login) if row else False,
        "coming_soon_title": (row.coming_soon_title if row else "") or "Em breve",
        "coming_soon_subtitle": (row.coming_soon_subtitle if row else "") or "",
        "coming_soon_at": info.coming_soon_at,
        "is_active": True,
    }


def _parse_coming_soon_at(raw) -> object | None:
    return _parse_optional_datetime(raw, field="coming_soon_at")


def _parse_optional_datetime(raw, *, field: str) -> object | None:
    from django.utils import timezone
    from django.utils.dateparse import parse_datetime

    if raw in (None, ""):
        return None
    text = str(raw).strip().replace("Z", "+00:00")
    parsed = parse_datetime(text)
    if parsed is None:
        raise ValidationDomainError(f"{field} precisa usar data e hora ISO 8601.")
    if timezone.is_naive(parsed):
        parsed = timezone.make_aware(parsed, timezone.get_current_timezone())
    return parsed


def _list_staff_service_prices(prices: IServicePriceRepository) -> list[dict]:
    existing = {row.code: row for row in prices.list_all()}
    payload = []
    for code, name, price in DEFAULT_SERVICES:
        row = existing.get(code)
        payload.append(
            {
                "code": code,
                "name": row.name if row else name,
                "price": str(row.price if row else price),
                "active": row.active if row else True,
            }
        )
    for code, row in existing.items():
        if code in {item[0] for item in DEFAULT_SERVICES}:
            continue
        payload.append({"code": row.code, "name": row.name, "price": str(row.price), "active": row.active})
    return payload


def _coin_config_payload(row, *, settings_module=settings) -> dict:
    if row is None:
        return {
            "id": None,
            "name": "Adena",
            "coin_id": 57,
            "multiplier": "1.00",
            "usd_multiplier": str(getattr(settings_module, "COINS_PER_USD", "5.00")),
            "withdraw_fee_percent": "0.00",
            "active": True,
        }
    return {
        "id": str(row.id),
        "name": row.name,
        "coin_id": row.coin_id,
        "multiplier": str(row.multiplier),
        "usd_multiplier": str(row.usd_multiplier),
        "withdraw_fee_percent": str(row.withdraw_fee_percent),
        "active": row.active,
    }


def _wallet_promo_payload(row) -> dict:
    if row is None:
        return {
            "id": None,
            "percent": "10.00",
            "title": "Promoção de recarga",
            "description": "",
            "active": False,
            "starts_at": None,
            "ends_at": None,
            "currently_active": False,
        }
    return {
        "id": str(row.id),
        "percent": str(row.percent),
        "title": row.title,
        "description": row.description,
        "active": row.active,
        "starts_at": row.starts_at.isoformat() if row.starts_at else None,
        "ends_at": row.ends_at.isoformat() if row.ends_at else None,
        "currently_active": row.is_currently_active(),
    }


class GetPanelSettingsUseCase(UseCase[None, dict]):
    """Retorna as configurações efetivas do painel, usando padrões quando não há configuração
    persistida.

    Uso: resolva pelo container e chame ``execute(data)`` com ``None`` (ou omita o argumento). O
    retorno é ``dict``.
    """

    def __init__(self, server_info: GetServerInfoUseCase, index_config: IIndexConfigRepository) -> None:
        self._server_info = server_info
        self._index_config = index_config

    def execute(self, data: None = None) -> dict:
        return _panel_defaults(self._server_info, self._index_config)


class UpdatePanelSettingsUseCase(UseCase[dict, dict]):
    """Cria ou atualiza a configuração ativa do painel e retorna os valores efetivos.

    Uso: resolva pelo container e chame ``execute(data)`` com ``dict``. O retorno é ``dict``.
    """

    def __init__(self, server_info: GetServerInfoUseCase, index_config: IIndexConfigRepository) -> None:
        self._server_info = server_info
        self._index_config = index_config

    def execute(self, data: dict) -> dict:
        row = self._index_config.get_active()
        if row is None:
            row = self._index_config.new()
        row.slogan = str(data.get("slogan") or row.slogan or "")
        row.name = str(data.get("name") or "")
        row.description = str(data.get("description") or "")
        row.chronicle = str(data.get("chronicle") or "")
        row.rates = data.get("rates") or row.rates or {}
        row.enchant = data.get("enchant") or row.enchant or {}
        row.max_level = int(data.get("max_level") or row.max_level or 80)
        features = data.get("features")
        if isinstance(features, str):
            features = [line.strip() for line in features.splitlines() if line.strip()]
        row.features = features if features is not None else row.features
        row.notes = data.get("notes") or row.notes or {}
        if "coming_soon" in data:
            row.coming_soon = bool(data.get("coming_soon"))
        if "staff_only_login" in data:
            row.staff_only_login = bool(data.get("staff_only_login"))
        if "coming_soon_title" in data:
            row.coming_soon_title = str(data.get("coming_soon_title") or "").strip()[:200]
        if "coming_soon_subtitle" in data:
            row.coming_soon_subtitle = str(data.get("coming_soon_subtitle") or "").strip()[:300]
        if "coming_soon_at" in data:
            row.coming_soon_at = _parse_coming_soon_at(data.get("coming_soon_at"))
        if row.coming_soon and row.coming_soon_at is None:
            raise ValidationDomainError("Defina a data e hora do lançamento para ativar o Coming Soon.")
        if not row.coming_soon_title:
            row.coming_soon_title = "Em breve"
        row.is_active = True
        self._index_config.save(row)
        return _panel_defaults(self._server_info, self._index_config)


class ListStaffServicePricesUseCase(UseCase[None, list[dict]]):
    """Lista os preços administrativos dos serviços, incluindo os códigos previstos pelo painel.

    Uso: resolva pelo container e chame ``execute(data)`` com ``None`` (ou omita o argumento). O
    retorno é ``list[dict]``.
    """

    def __init__(self, prices: IServicePriceRepository) -> None:
        self._prices = prices

    def execute(self, data: None = None) -> list[dict]:
        return _list_staff_service_prices(self._prices)


class UpsertStaffServicePricesUseCase(UseCase[list[dict], list[dict]]):
    """Cria ou atualiza preços por código de serviço e retorna a lista resultante.

    Uso: resolva pelo container e chame ``execute(data)`` com ``list[dict]``. O retorno é
    ``list[dict]``.
    """

    def __init__(self, prices: IServicePriceRepository) -> None:
        self._prices = prices

    def execute(self, data: list[dict]) -> list[dict]:
        if not data:
            raise ValidationDomainError("Informe ao menos um serviço.")
        for item in data:
            code = str(item.get("code") or "").strip().upper()
            if not code:
                raise ValidationDomainError("Código do serviço é obrigatório.")
            price = Decimal(str(item.get("price") or "0"))
            if price < 0:
                raise ValidationDomainError("O preço não pode ser negativo.")
            self._prices.upsert(
                code=code,
                name=str(item.get("name") or code),
                price=price,
                active=bool(item.get("active", True)),
            )
        return _list_staff_service_prices(self._prices)


class GetStaffCoinConfigUseCase(UseCase[None, dict]):
    """Obtém a configuração ativa de moedas, a mais recente ou os valores padrão quando não há
    registro.

    Uso: resolva pelo container e chame ``execute(data)`` com ``None`` (ou omita o argumento). O
    retorno é ``dict``.
    """

    def __init__(self, coins: ICoinAdminRepository) -> None:
        self._coins = coins

    def execute(self, data: None = None) -> dict:
        return _coin_config_payload(self._coins.get_coin_config())


class UpdateStaffCoinConfigUseCase(UseCase[dict, dict]):
    """Salva identificação da moeda, multiplicadores e taxa de retirada e retorna a configuração
    atualizada.

    Uso: resolva pelo container e chame ``execute(data)`` com ``dict``. O retorno é ``dict``.
    """

    def __init__(self, coins: ICoinAdminRepository, item_names: IItemDisplayName) -> None:
        self._coins = coins
        self._item_names = item_names

    def execute(self, data: dict) -> dict:
        row = self._coins.get_coin_config()
        if row is None:
            row = self._coins.new_coin_config(name="Adena")
        row.coin_id = int(data.get("coin_id") or row.coin_id or 57)
        row.name = self._item_names.display_name(row.coin_id)
        row.multiplier = Decimal(str(data.get("multiplier") or row.multiplier or "1"))
        row.usd_multiplier = Decimal(str(data.get("usd_multiplier") or row.usd_multiplier or "5"))
        row.withdraw_fee_percent = Decimal(str(data.get("withdraw_fee_percent") or row.withdraw_fee_percent or "0"))
        row.active = True
        self._coins.save_coin_config(row)
        return _coin_config_payload(self._coins.get_coin_config())


class GetStaffWalletPromoUseCase(UseCase[None, dict]):
    """Obtém a promoção de recarga ativa, a mais recente ou valores padrão sem campanha.

    Uso: resolva pelo container e chame ``execute(data)`` com ``None`` (ou omita o argumento). O
    retorno é ``dict``.
    """

    def __init__(self, coins: ICoinAdminRepository) -> None:
        self._coins = coins

    def execute(self, data: None = None) -> dict:
        return _wallet_promo_payload(self._coins.get_promo())


class UpdateStaffWalletPromoUseCase(UseCase[dict, dict]):
    """Cria ou atualiza a campanha de banner/bônus de recarga da carteira.

    Uso: resolva pelo container e chame ``execute(data)`` com ``dict``. O retorno é ``dict``.
    """

    def __init__(self, coins: ICoinAdminRepository) -> None:
        self._coins = coins

    def execute(self, data: dict) -> dict:
        row = self._coins.get_promo()
        if row is None:
            row = self._coins.new_promo(title="Promoção de recarga", percent=Decimal("10.00"), active=False)
        title = str(data.get("title") or "").strip()
        if not title:
            raise ValidationDomainError("Informe o título da promoção.")
        percent = Decimal(str(data.get("percent") if data.get("percent") is not None else row.percent or "0"))
        if percent < 0 or percent > 100:
            raise ValidationDomainError("O percentual da promoção deve estar entre 0 e 100.")
        row.title = title
        row.description = str(data.get("description") or "")
        row.percent = percent
        row.active = bool(data.get("active", row.active))
        row.starts_at = _parse_optional_datetime(data.get("starts_at"), field="starts_at")
        row.ends_at = _parse_optional_datetime(data.get("ends_at"), field="ends_at")
        if row.starts_at and row.ends_at and row.ends_at <= row.starts_at:
            raise ValidationDomainError("A data final deve ser posterior ao início da promoção.")
        self._coins.save_promo(row)
        return _wallet_promo_payload(row)


class ListStaffShopItemsUseCase(UseCase[None, list[dict]]):
    """Lista todos os produtos da loja para administração, inclusive os inativos.

    Uso: resolva pelo container e chame ``execute(data)`` com ``None`` (ou omita o argumento). O
    retorno é ``list[dict]``.
    """

    def __init__(self, shop_items: IShopItemAdminRepository) -> None:
        self._shop_items = shop_items

    def execute(self, data: None = None) -> list[dict]:
        return [
            {
                "id": str(item.id),
                "name": item.name,
                "item_id": item.item_id,
                "price": str(item.price),
                "quantity": item.quantity,
                "active": item.active,
            }
            for item in self._shop_items.list_all()
        ]


class UpsertStaffShopItemUseCase(UseCase[dict, dict]):
    """Cria ou atualiza um produto da loja com identificação do item, preço, quantidade e ativação.

    Uso: resolva pelo container e chame ``execute(data)`` com ``dict``. O retorno é ``dict``.
    """

    def __init__(self, shop_items: IShopItemAdminRepository, item_names: IItemDisplayName) -> None:
        self._shop_items = shop_items
        self._item_names = item_names

    def execute(self, data: dict) -> dict:
        item_id = int(data.get("item_id") or 0)
        if item_id <= 0:
            raise ValidationDomainError("Informe o ID do item no jogo.")
        name = self._item_names.display_name(item_id)
        price = Decimal(str(data.get("price") or "0"))
        quantity = int(data.get("quantity") or 1)
        active = bool(data.get("active", True))
        row = self._shop_items.get_by_id(data["id"]) if data.get("id") else None
        if row is None:
            row = self._shop_items.new(name=name, item_id=item_id, price=price, quantity=quantity, active=active)
        else:
            row.name = name
            row.item_id = item_id
            row.price = price
            row.quantity = quantity
            row.active = active
        self._shop_items.save(row)
        return {
            "id": str(row.id),
            "name": row.name,
            "item_id": row.item_id,
            "price": str(row.price),
            "quantity": row.quantity,
            "active": row.active,
        }


class ListStaffNewsUseCase(UseCase[None, list[dict]]):
    """Lista notícias para administração, incluindo rascunhos e estado de publicação.

    Uso: resolva pelo container e chame ``execute(data)`` com ``None`` (ou omita o argumento). O
    retorno é ``list[dict]``.
    """

    def __init__(self, news: INewsAdminRepository) -> None:
        self._news = news

    def execute(self, data: None = None) -> list[dict]:
        return [
            {
                "id": str(item.id),
                "slug": item.slug,
                "title": item.title,
                "excerpt": item.excerpt,
                "body": item.body,
                "is_published": item.is_published,
                "published_at": item.published_at.isoformat() if item.published_at else None,
            }
            for item in self._news.list_all()
        ]


class UpsertStaffNewsUseCase(UseCase[dict, dict]):
    """Cria ou atualiza notícia, verifica os dados necessários e trata o slug antes de persistir.

    Uso: resolva pelo container e chame ``execute(data)`` com ``dict``. O retorno é ``dict``.
    """

    def __init__(self, news: INewsAdminRepository) -> None:
        self._news = news

    def execute(self, data: dict) -> dict:
        from common.richtext import is_rich_text_empty, sanitize_rich_text

        title = str(data.get("title") or "").strip()
        body = sanitize_rich_text(str(data.get("body") or ""))
        if not title or is_rich_text_empty(body):
            raise ValidationDomainError("Título e conteúdo são obrigatórios.")
        row = self._news.get_by_id(data["id"]) if data.get("id") else None
        if row is None:
            row = self._news.new(title=title, body=body)
            base = slugify(title)[:180] or "noticia"
            slug = base
            suffix = 2
            while self._news.slug_exists(slug):
                slug = f"{base}-{suffix}"
                suffix += 1
            row.slug = slug
        row.title = title
        row.body = body
        row.excerpt = str(data.get("excerpt") or "")[:300]
        if data.get("slug"):
            row.slug = slugify(str(data["slug"]))[:200]
        row.is_published = bool(data.get("is_published", False))
        self._news.save(row)
        return {
            "id": str(row.id),
            "slug": row.slug,
            "title": row.title,
            "excerpt": row.excerpt,
            "body": row.body,
            "is_published": row.is_published,
            "published_at": row.published_at.isoformat() if row.published_at else None,
        }


class ListStaffGamesUseCase(UseCase[None, list[dict]]):
    """Lista todos os jogos e suas configurações para administração.

    Uso: resolva pelo container e chame ``execute(data)`` com ``None`` (ou omita o argumento). O
    retorno é ``list[dict]``.
    """

    def __init__(self, games: IGameConfigAdminRepository) -> None:
        self._games = games

    def execute(self, data: None = None) -> list[dict]:
        return [
            {
                "id": str(item.id),
                "code": item.code,
                "name": item.name,
                "active": item.active,
                "settings": item.settings or {},
            }
            for item in self._games.list_all()
        ]


class ToggleStaffGameUseCase(UseCase[dict, dict]):
    """Altera ativação e configurações de um jogo identificado por UUID ou código.

    Uso: resolva pelo container e chame ``execute(data)`` com ``dict``. O retorno é ``dict``.
    """

    def __init__(self, games: IGameConfigAdminRepository) -> None:
        self._games = games

    def execute(self, data: dict) -> dict:
        row = self._games.get_by_id(data["id"]) if data.get("id") else None
        if row is None:
            row = self._games.get_by_code(str(data.get("code") or ""))
        if row is None:
            raise EntityNotFoundError("Jogo não encontrado.")
        if "active" in data:
            row.active = bool(data.get("active"))
        if isinstance(data.get("settings"), dict):
            row.settings = data["settings"]
        if data.get("name"):
            row.name = str(data["name"])
        self._games.save(row)
        return {"id": str(row.id), "code": row.code, "name": row.name, "active": row.active, "settings": row.settings}
