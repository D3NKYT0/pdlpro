from django.contrib import admin

from apps.auction.infrastructure.models import Auction, Bid
from common.admin import PDLModelAdmin


@admin.register(Auction)
class AuctionAdmin(PDLModelAdmin):
    """Configura a administração Django de ``Auction``.

    A listagem exibe ``item_name``, ``seller``, ``min_bid``, ``current_bid``, ``status``,
    ``ends_at``. Ajuste filtros, busca e campos nesta classe para mudar a experiência da equipe
    no admin; regras reutilizáveis ficam na aplicação.
    """

    list_display = ("item_name", "seller", "min_bid", "current_bid", "status", "ends_at")
    list_filter = ("status",)


@admin.register(Bid)
class BidAdmin(PDLModelAdmin):
    """Configura a administração Django de ``Bid``.

    A listagem exibe ``auction``, ``bidder``, ``amount``, ``created_at``. Ajuste filtros, busca
    e campos nesta classe para mudar a experiência da equipe no admin; regras reutilizáveis
    ficam na aplicação.
    """

    list_display = ("auction", "bidder", "amount", "created_at")
