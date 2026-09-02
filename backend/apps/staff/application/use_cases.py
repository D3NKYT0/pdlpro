from __future__ import annotations

from decimal import Decimal

from django.conf import settings
from django.utils.text import slugify

from apps.content.infrastructure.models import News
from apps.games.infrastructure.models import GameConfig
from apps.server.application.use_cases import GetServerInfoUseCase
from apps.server.infrastructure.models import IndexConfig, ServicePrice
from apps.server.infrastructure.lineage.item_catalog import item_display_name
from apps.shop.infrastructure.models import ShopItem
from apps.wallet.infrastructure.models import CoinConfig
from common.architecture.base import UseCase
from common.architecture.exceptions import EntityNotFoundError, ValidationDomainError

DEFAULT_SERVICES = (
    ("CHANGE_NICKNAME", "Troca de nickname", Decimal("10.00")),
    ("CHANGE_SEX", "Troca de sexo", Decimal("10.00")),
    ("LINK_SLOT", "Slot extra de conta", Decimal("10.00")),
    ("UNSTUCK", "Destravar personagem", Decimal("0.00")),
)


def _panel_defaults() -> dict:
    info = GetServerInfoUseCase().execute()
    row = IndexConfig.objects.filter(is_active=True).order_by("-updated_at").first()
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
        "is_active": True,
    }


class GetPanelSettingsUseCase(UseCase[None, dict]):
    def execute(self, data: None = None) -> dict:
        return _panel_defaults()


class UpdatePanelSettingsUseCase(UseCase[dict, dict]):
    def execute(self, data: dict) -> dict:
        row = IndexConfig.objects.filter(is_active=True).order_by("-updated_at").first()
        if row is None:
            row = IndexConfig()
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
        row.is_active = True
        row.save()
        return _panel_defaults()


class ListStaffServicePricesUseCase(UseCase[None, list[dict]]):
    def execute(self, data: None = None) -> list[dict]:
        existing = {row.code: row for row in ServicePrice.objects.all()}
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


class UpsertStaffServicePricesUseCase(UseCase[list[dict], list[dict]]):
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
            ServicePrice.objects.update_or_create(
                code=code,
                defaults={
                    "name": str(item.get("name") or code),
                    "price": price,
                    "active": bool(item.get("active", True)),
                },
            )
        return ListStaffServicePricesUseCase().execute()


class GetStaffCoinConfigUseCase(UseCase[None, dict]):
    def execute(self, data: None = None) -> dict:
        row = CoinConfig.objects.filter(active=True).first() or CoinConfig.objects.order_by("-updated_at").first()
        if row is None:
            return {
                "id": None,
                "name": "Adena",
                "coin_id": 57,
                "multiplier": "1.00",
                "usd_multiplier": str(getattr(settings, "COINS_PER_USD", "5.00")),
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


class UpdateStaffCoinConfigUseCase(UseCase[dict, dict]):
    def execute(self, data: dict) -> dict:
        row = CoinConfig.objects.filter(active=True).first() or CoinConfig.objects.order_by("-updated_at").first()
        if row is None:
            row = CoinConfig(name="Adena")
        row.coin_id = int(data.get("coin_id") or row.coin_id or 57)
        row.name = item_display_name(row.coin_id)
        row.multiplier = Decimal(str(data.get("multiplier") or row.multiplier or "1"))
        row.usd_multiplier = Decimal(str(data.get("usd_multiplier") or row.usd_multiplier or "5"))
        row.withdraw_fee_percent = Decimal(str(data.get("withdraw_fee_percent") or row.withdraw_fee_percent or "0"))
        row.active = True
        row.save()
        return GetStaffCoinConfigUseCase().execute()


class ListStaffShopItemsUseCase(UseCase[None, list[dict]]):
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
            for item in ShopItem.objects.all().order_by("name")
        ]


class UpsertStaffShopItemUseCase(UseCase[dict, dict]):
    def execute(self, data: dict) -> dict:
        item_id = int(data.get("item_id") or 0)
        if item_id <= 0:
            raise ValidationDomainError("Informe o ID do item no jogo.")
        name = item_display_name(item_id)
        price = Decimal(str(data.get("price") or "0"))
        quantity = int(data.get("quantity") or 1)
        active = bool(data.get("active", True))
        row = ShopItem.objects.filter(id=data["id"]).first() if data.get("id") else None
        if row is None:
            row = ShopItem(name=name, item_id=item_id, price=price, quantity=quantity, active=active)
        else:
            row.name = name
            row.item_id = item_id
            row.price = price
            row.quantity = quantity
            row.active = active
        row.save()
        return {
            "id": str(row.id),
            "name": row.name,
            "item_id": row.item_id,
            "price": str(row.price),
            "quantity": row.quantity,
            "active": row.active,
        }


class ListStaffNewsUseCase(UseCase[None, list[dict]]):
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
            for item in News.objects.all().order_by("-published_at", "-created_at")
        ]


class UpsertStaffNewsUseCase(UseCase[dict, dict]):
    def execute(self, data: dict) -> dict:
        title = str(data.get("title") or "").strip()
        body = str(data.get("body") or "").strip()
        if not title or not body:
            raise ValidationDomainError("Título e conteúdo são obrigatórios.")
        row = News.objects.filter(id=data["id"]).first() if data.get("id") else None
        if row is None:
            row = News(title=title, body=body)
            base = slugify(title)[:180] or "noticia"
            slug = base
            suffix = 2
            while News.objects.filter(slug=slug).exists():
                slug = f"{base}-{suffix}"
                suffix += 1
            row.slug = slug
        row.title = title
        row.body = body
        row.excerpt = str(data.get("excerpt") or "")[:300]
        if data.get("slug"):
            row.slug = slugify(str(data["slug"]))[:200]
        row.is_published = bool(data.get("is_published", False))
        row.save()
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
    def execute(self, data: None = None) -> list[dict]:
        return [
            {
                "id": str(item.id),
                "code": item.code,
                "name": item.name,
                "active": item.active,
                "settings": item.settings or {},
            }
            for item in GameConfig.objects.all().order_by("name")
        ]


class ToggleStaffGameUseCase(UseCase[dict, dict]):
    def execute(self, data: dict) -> dict:
        row = GameConfig.objects.filter(id=data.get("id")).first() if data.get("id") else None
        if row is None:
            row = GameConfig.objects.filter(code=str(data.get("code") or "")).first()
        if row is None:
            raise EntityNotFoundError("Jogo não encontrado.")
        if "active" in data:
            row.active = bool(data.get("active"))
        if isinstance(data.get("settings"), dict):
            row.settings = data["settings"]
        if data.get("name"):
            row.name = str(data["name"])
        row.save()
        return {"id": str(row.id), "code": row.code, "name": row.name, "active": row.active, "settings": row.settings}
