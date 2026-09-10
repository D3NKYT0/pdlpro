from django.utils.translation import gettext as _
from rest_framework import serializers


class OperationalReportFiltersSerializer(serializers.Serializer):
    """Filtros e paginação comuns aos relatórios operacionais."""

    username = serializers.CharField(required=False, allow_blank=True, max_length=150)
    status = serializers.CharField(required=False, allow_blank=True, max_length=40)
    action = serializers.CharField(required=False, allow_blank=True, max_length=40)
    date_from = serializers.DateField(required=False)
    date_to = serializers.DateField(required=False)
    page = serializers.IntegerField(default=1, min_value=1)
    page_size = serializers.IntegerField(default=20, min_value=1, max_value=50)

    def validate(self, attrs):
        if attrs.get("date_from") and attrs.get("date_to") and attrs["date_from"] > attrs["date_to"]:
            raise serializers.ValidationError({"date_to": _("A data final deve ser igual ou posterior à inicial.")})
        return attrs


class InventoryReportFiltersSerializer(OperationalReportFiltersSerializer):
    """Filtros do relatório de movimentações de inventário."""

    action = serializers.ChoiceField(
        choices=[
            "RETIROU_DO_JOGO",
            "INSERIU_NO_JOGO",
            "TROCA_ENTRE_PERSONAGENS",
        ],
        required=False,
    )


class AuctionReportFiltersSerializer(OperationalReportFiltersSerializer):
    """Filtros do relatório de leilões."""

    status = serializers.ChoiceField(choices=["open", "finished", "cancelled"], required=False)


class PurchaseReportFiltersSerializer(OperationalReportFiltersSerializer):
    """Filtros do relatório de compras da loja."""

    status = serializers.CharField(required=False, allow_blank=True, max_length=20)


class MarketplaceReportFiltersSerializer(OperationalReportFiltersSerializer):
    """Filtros do relatório de marketplace."""

    status = serializers.ChoiceField(
        choices=["for_sale", "sold", "cancelled", "disputed"],
        required=False,
    )


class OperationalReportResponseSerializer(serializers.Serializer):
    """Envelope paginado dos relatórios operacionais."""

    count = serializers.IntegerField()
    total_pages = serializers.IntegerField()
    next = serializers.URLField(allow_null=True)
    previous = serializers.URLField(allow_null=True)
    results = serializers.ListField(child=serializers.DictField())
    summary = serializers.DictField()
