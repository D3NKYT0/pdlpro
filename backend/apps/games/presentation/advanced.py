from django.db.models import Count
from django.shortcuts import get_object_or_404
from rest_framework import serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.games.application.advanced import (
    battle_action,
    battle_details,
    buy_bait,
    daily_details,
    game_statistics,
)
from apps.games.application.rewards import validate_rewards
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
    Fish,
    FishingBait,
    FishingCatch,
    UserFishingBait,
)
from common.permissions import IsStaffMember


class BattleActionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(
        choices=["quest", "exchange", "milestone", "auto-claim"]
    )
    entry_id = serializers.UUIDField(required=False, allow_null=True)
    enabled = serializers.BooleanField(default=False)

    def validate(self, data):
        if data["action"] != "auto-claim" and not data.get("entry_id"):
            raise serializers.ValidationError("Selecione uma recompensa.")
        return data


class BattleDetailsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(battle_details(request.user))

    def post(self, request):
        serializer = BattleActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(battle_action(request.user.id, **serializer.validated_data))


class DailyDetailsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(daily_details(request.user))


class BaitPurchaseSerializer(serializers.Serializer):
    bait_id = serializers.UUIDField()
    quantity = serializers.IntegerField(min_value=1, max_value=999, default=1)


class FishingDetailsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        stock = dict(
            UserFishingBait.objects.filter(user=request.user).values_list(
                "bait_id", "quantity"
            )
        )
        catches = dict(
            FishingCatch.objects.filter(user=request.user, success=True)
            .values("fish_id")
            .annotate(total=Count("pk"))
            .values_list("fish_id", "total")
        )
        return Response(
            {
                "baits": [
                    {
                        "id": str(b.id),
                        "name": b.name,
                        "description": b.description,
                        "price": b.price,
                        "success_bonus": b.success_bonus,
                        "quantity": stock.get(b.pk, 0),
                    }
                    for b in FishingBait.objects.filter(active=True)
                ],
                "collection": [
                    {
                        "id": str(f.id),
                        "name": f.name,
                        "rarity": f.rarity,
                        "count": catches.get(f.pk, 0),
                    }
                    for f in Fish.objects.filter(active=True)
                ],
            }
        )

    def post(self, request):
        serializer = BaitPurchaseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(buy_bait(request.user.id, **serializer.validated_data))


class GameStatisticsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, kind):
        return Response(game_statistics(request.user, kind))


CONFIG_MODELS = {
    "seasons": (
        BattlePassSeason,
        ["name", "starts_at", "ends_at", "active", "premium_price"],
    ),
    "levels": (BattlePassLevel, ["season", "level", "required_xp"]),
    "rewards": (
        BattlePassReward,
        [
            "level_row",
            "is_premium",
            "item_id",
            "item_name",
            "enchant",
            "quantity",
            "description",
        ],
    ),
    "quests": (
        BattlePassQuest,
        ["season", "name", "description", "event", "target", "xp", "period", "active"],
    ),
    "exchanges": (
        BattlePassExchange,
        [
            "season",
            "name",
            "required_item_id",
            "required_enchant",
            "required_quantity",
            "rewards",
            "limit_per_user",
            "active",
        ],
    ),
    "milestones": (BattlePassMilestone, ["season", "name", "required_xp", "rewards"]),
    "daily-seasons": (DailyBonusSeason, ["name", "starts_on", "ends_on", "active"]),
    "daily-days": (DailyBonusDay, ["season", "day", "rewards"]),
    "daily-pool": (DailyBonusPoolEntry, ["season", "name", "weight", "rewards"]),
    "baits": (FishingBait, ["name", "description", "price", "success_bonus", "active"]),
}


def config_serializer(kind):
    if kind not in CONFIG_MODELS:
        raise serializers.ValidationError("Configuração desconhecida.")
    model, fields = CONFIG_MODELS[kind]

    class ConfigSerializer(serializers.ModelSerializer):
        class Meta:
            pass

        def validate(self, data):
            def value(key):
                return data.get(key, getattr(self.instance, key, None))

            for key in (
                "target",
                "quantity",
                "required_item_id",
                "item_id",
                "required_quantity",
                "day",
                "weight",
            ):
                if key in data and data[key] < 1:
                    raise serializers.ValidationError({key: "Deve ser maior que zero."})
            if "success_bonus" in data and data["success_bonus"] > 90:
                raise serializers.ValidationError(
                    {"success_bonus": "Máximo de 90 pontos percentuais."}
                )
            if "rewards" in data:
                data["rewards"] = validate_rewards(data["rewards"])
            for start_key, end_key in (
                ("starts_at", "ends_at"),
                ("starts_on", "ends_on"),
            ):
                start, end = value(start_key), value(end_key)
                if start and end:
                    if end < start:
                        raise serializers.ValidationError(
                            "A data final deve ser posterior à inicial."
                        )
                    overlapping = model.objects.filter(
                        **{
                            f"{start_key}__lte": end,
                            f"{end_key}__gte": start,
                            "active": True,
                        }
                    )
                    if self.instance:
                        overlapping = overlapping.exclude(pk=self.instance.pk)
                    if value("active") is not False and overlapping.exists():
                        raise serializers.ValidationError(
                            "Já existe uma temporada ativa neste período."
                        )
            if (
                kind == "daily-days"
                and value("season")
                and value("day")
                > (value("season").ends_on - value("season").starts_on).days + 1
            ):
                raise serializers.ValidationError(
                    "O dia está fora da duração da temporada."
                )
            return data

    ConfigSerializer.Meta.model = model
    ConfigSerializer.Meta.fields = ["id", *fields]
    ConfigSerializer.Meta.read_only_fields = ["id"]
    ConfigSerializer.Meta.extra_kwargs = (
        {"premium_price": {"min_value": 0}} if kind == "seasons" else {}
    )
    for field in fields:
        model_field = model._meta.get_field(field)
        if model_field.many_to_one:
            ConfigSerializer._declared_fields[field] = serializers.SlugRelatedField(
                slug_field="id", queryset=model_field.related_model.objects.all()
            )
    return ConfigSerializer


class StaffGameContentView(APIView):
    permission_classes = [IsAuthenticated, IsStaffMember]

    def get(self, request, kind):
        cls = config_serializer(kind)
        return Response(cls(cls.Meta.model.objects.all(), many=True).data)

    def post(self, request, kind):
        serializer = config_serializer(kind)(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=201)

    def patch(self, request, kind, entry_id):
        cls = config_serializer(kind)
        serializer = cls(
            get_object_or_404(cls.Meta.model, id=entry_id),
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
