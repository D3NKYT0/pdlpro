from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from apps.games.infrastructure.models import (
    BattlePassExchange,
    BattlePassLevel,
    BattlePassMilestone,
    BattlePassQuest,
    BattlePassReward,
    BattlePassSeason,
    DailyBonusDay,
    DailyBonusPoolEntry,
    DailyBonusSeason,
    FishingBait,
    GameConfig,
    UserBattlePassProgress,
    UserFishingBait,
)
from apps.programs.models import Commission, RoadmapEntry, Supporter
from apps.shop.infrastructure.models import (
    PromotionCode,
    ShopItem,
    ShopPackage,
    ShopPackageItem,
    ShopPurchase,
)
from apps.wallet.infrastructure.models import CoinConfig, Wallet


class Command(BaseCommand):
    """Comando Django ``seed_program_preview``.

    Cria dados fictícios apenas em core.settings.preview. Execute ``python manage.py
    seed_program_preview --help`` para consultar opções antes de rodar a rotina no ambiente
    desejado.
    """

    help = "Cria dados fictícios apenas em core.settings.preview."

    def add_arguments(self, parser):
        parser.add_argument("--password", required=True)

    def handle(self, *args, **options):
        if not getattr(settings, "PDL_QA_PREVIEW", False):
            raise CommandError(
                "Use --settings=core.settings.preview; o banco normal não é permitido."
            )
        user, _ = get_user_model().objects.get_or_create(
            username="preview", defaults={"email": "preview@example.test"}
        )
        user.set_password(options["password"])
        user.is_staff = user.is_superuser = user.is_email_verified = True
        user.fichas = 500
        user.save()
        Wallet.objects.update_or_create(
            user=user, defaults={"balance": 1500, "bonus_balance": 100}
        )
        supporter, _ = Supporter.objects.update_or_create(
            user=user,
            defaults={
                "name": "Guardião de Aden",
                "channel_url": "https://example.com",
                "description": "Guias, aventuras e histórias para nossa comunidade.",
                "status": "approved",
                "commission_percent": 10,
            },
        )
        purchase, _ = ShopPurchase.objects.get_or_create(
            user=user, promo_code="PREVIEW", defaults={"total": 250}
        )
        Commission.objects.get_or_create(
            supporter=supporter, purchase=purchase, defaults={"amount": 25}
        )
        PromotionCode.objects.get_or_create(
            code="ADEN10", defaults={"percent": 10, "supporter": supporter}
        )
        PromotionCode.objects.get_or_create(code="BEMVINDO", defaults={"percent": 15})
        for title, status, progress, category in [
            ("Uma nova era de batalhas", "progress", 65, "Eventos"),
            ("Expedição às terras do norte", "planned", 15, "Mundo"),
            ("Sua jornada, recompensada", "completed", 100, "Painel"),
        ]:
            RoadmapEntry.objects.get_or_create(
                title=title,
                defaults={
                    "status": status,
                    "progress": progress,
                    "category": category,
                    "description": "Novos desafios e recompensas para os guerreiros de Aden. Acompanhe os próximos testes e participe da evolução do servidor.",
                    "target_date": timezone.localdate() + timedelta(days=14),
                },
            )
        adena, _ = ShopItem.objects.get_or_create(
            name="Reserva de Adena",
            defaults={"item_id": 57, "price": 15, "quantity": 100000},
        )
        coin, _ = ShopItem.objects.get_or_create(
            name="Moedas de aventura",
            defaults={"item_id": 4037, "price": 25, "quantity": 10},
        )
        pack, _ = ShopPackage.objects.get_or_create(
            name="Kit do aventureiro", defaults={"total_price": 35}
        )
        ShopPackageItem.objects.get_or_create(
            package=pack, item=adena, defaults={"quantity": 2}
        )
        ShopPackageItem.objects.get_or_create(
            package=pack, item=coin, defaults={"quantity": 1}
        )
        CoinConfig.objects.get_or_create(
            name="Adena", defaults={"coin_id": 57, "multiplier": 1, "active": True}
        )
        BattlePassSeason.objects.all().update(active=False)
        season, _ = BattlePassSeason.objects.update_or_create(
            name="Legado de Aden",
            defaults={
                "starts_at": timezone.now() - timedelta(days=2),
                "ends_at": timezone.now() + timedelta(days=28),
                "active": True,
                "premium_price": 50,
            },
        )
        for i in range(1, 4):
            level, _ = BattlePassLevel.objects.get_or_create(
                season=season, level=i, defaults={"required_xp": i * 100}
            )
            BattlePassReward.objects.get_or_create(
                level_row=level,
                is_premium=False,
                defaults={"item_id": 57, "item_name": "Adena", "quantity": i * 500},
            )
            BattlePassReward.objects.get_or_create(
                level_row=level,
                is_premium=True,
                defaults={"item_id": 4037, "item_name": "Coin of Luck", "quantity": i},
            )
        UserBattlePassProgress.objects.update_or_create(
            user=user, season=season, defaults={"xp": 150}
        )
        for name, event, target, period in [
            ("A sorte acompanha os bravos", "roulette", 3, "daily"),
            ("Pescador de primeira viagem", "fishing", 5, "weekly"),
            ("Presença que vale ouro", "daily_bonus", 1, "daily"),
        ]:
            BattlePassQuest.objects.get_or_create(
                season=season,
                name=name,
                defaults={
                    "description": "Complete o objetivo para avançar no passe de batalha.",
                    "event": event,
                    "target": target,
                    "period": period,
                    "xp": 50,
                },
            )
        rewards = [
            {"kind": "item", "item_id": 4037, "name": "Coin of Luck", "quantity": 2}
        ]
        BattlePassExchange.objects.get_or_create(
            season=season,
            name="Tesouro do aventureiro",
            defaults={
                "required_item_id": 57,
                "required_quantity": 1000,
                "rewards": rewards,
                "limit_per_user": 3,
            },
        )
        BattlePassMilestone.objects.get_or_create(
            season=season,
            name="Primeiros passos",
            defaults={"required_xp": 100, "rewards": rewards},
        )
        daily, _ = DailyBonusSeason.objects.get_or_create(
            name="Sete dias de aventura",
            defaults={
                "starts_on": timezone.localdate(),
                "ends_on": timezone.localdate() + timedelta(days=6),
            },
        )
        for day in range(1, 8):
            DailyBonusDay.objects.get_or_create(
                season=daily,
                day=day,
                defaults={"rewards": [{"kind": "tokens", "quantity": day * 5}]},
            )
        DailyBonusPoolEntry.objects.get_or_create(
            season=daily,
            name="Um toque de sorte",
            defaults={"weight": 3, "rewards": rewards},
        )
        DailyBonusPoolEntry.objects.get_or_create(
            season=daily,
            name="Reserva para a jornada",
            defaults={"weight": 7, "rewards": [{"kind": "bonus", "quantity": "5.00"}]},
        )
        for name, price, bonus in [
            ("Isca do aprendiz", 3, 5),
            ("Isca encantada", 8, 15),
        ]:
            bait, _ = FishingBait.objects.get_or_create(
                name=name,
                defaults={
                    "price": price,
                    "success_bonus": bonus,
                    "description": "Uma chance extra para trazer seu próximo troféu.",
                },
            )
            UserFishingBait.objects.update_or_create(
                user=user, bait=bait, defaults={"quantity": 5}
            )
        for code in ("daily_bonus", "fishing"):
            GameConfig.objects.filter(code=code).update(active=True)
        self.stdout.write(
            self.style.SUCCESS(
                "Dados fictícios criados no banco isolado. Usuário: preview."
            )
        )
