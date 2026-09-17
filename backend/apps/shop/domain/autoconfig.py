from __future__ import annotations

from abc import ABC, abstractmethod
from typing import NamedTuple


class ShopSku(NamedTuple):
    """Produto avulso do catálogo low grade: chave estável, ID Interlude, stack e preço."""

    key: str
    item_id: int
    quantity: int
    price: str


class ShopPackageSpec(NamedTuple):
    """Pacote do catálogo: nome canônico, preço com desconto e SKUs ``(key, quantity)``."""

    name: str
    total_price: str
    items: tuple[tuple[str, int], ...]


# IDs Interlude (`data/items`). Stacks de servidor low grade (NG/D/C), não S-grade.
SHOP_ITEM_SKUS: tuple[ShopSku, ...] = (
    ShopSku("adena_1m", 57, 1_000_000, "8.00"),
    ShopSku("adena_5m", 57, 5_000_000, "35.00"),
    ShopSku("adena_10m", 57, 10_000_000, "60.00"),
    ShopSku("ss_ng_10k", 1835, 10_000, "6.00"),
    ShopSku("ss_ng_50k", 1835, 50_000, "25.00"),
    ShopSku("ss_d_10k", 1463, 10_000, "12.00"),
    ShopSku("ss_c_5k", 1464, 5_000, "18.00"),
    ShopSku("sps_ng_5k", 2509, 5_000, "6.00"),
    ShopSku("sps_d_3k", 2510, 3_000, "8.00"),
    ShopSku("bss_ng_5k", 3947, 5_000, "10.00"),
    ShopSku("bss_d_3k", 3948, 3_000, "14.00"),
    ShopSku("bss_c_2k", 3949, 2_000, "16.00"),
    ShopSku("heal_100", 1061, 100, "3.00"),
    ShopSku("gheal_100", 1539, 100, "6.00"),
    ShopSku("qheal_50", 1540, 50, "8.00"),
    ShopSku("cp_100", 5591, 100, "5.00"),
    ShopSku("gcp_50", 5592, 50, "8.00"),
    ShopSku("haste_20", 1374, 20, "4.00"),
    ShopSku("antidote_50", 1831, 50, "3.00"),
    ShopSku("soe_50", 736, 50, "3.00"),
    ShopSku("sor_20", 737, 20, "4.00"),
    ShopSku("bsoe_20", 1538, 20, "10.00"),
    ShopSku("bres_10", 3936, 10, "12.00"),
    ShopSku("crystal_d_100", 1458, 100, "6.00"),
    ShopSku("crystal_c_50", 1459, 50, "10.00"),
    ShopSku("gem_d_50", 2130, 50, "8.00"),
    ShopSku("gem_c_20", 2131, 20, "10.00"),
    ShopSku("enc_w_d", 955, 1, "15.00"),
    ShopSku("enc_a_d", 956, 1, "8.00"),
    ShopSku("enc_w_c", 951, 1, "40.00"),
    ShopSku("enc_a_c", 952, 1, "20.00"),
    ShopSku("gold_bar", 3470, 1, "50.00"),
    ShopSku("col_10", 4037, 10, "25.00"),
)

SHOP_PACKAGES: tuple[ShopPackageSpec, ...] = (
    ShopPackageSpec(
        "Kit Iniciante",
        "16.00",
        (("adena_1m", 1), ("ss_ng_10k", 1), ("heal_100", 1), ("soe_50", 1)),
    ),
    ShopPackageSpec(
        "Kit Mago NG",
        "22.00",
        (("adena_1m", 1), ("bss_ng_5k", 1), ("sps_ng_5k", 1), ("heal_100", 1)),
    ),
    ShopPackageSpec(
        "Kit Farm D",
        "48.00",
        (("adena_5m", 1), ("ss_d_10k", 1), ("gheal_100", 1), ("crystal_d_100", 1)),
    ),
    ShopPackageSpec(
        "Kit PvP",
        "36.00",
        (
            ("gcp_50", 1),
            ("qheal_50", 1),
            ("bsoe_20", 1),
            ("bres_10", 1),
            ("haste_20", 1),
            ("antidote_50", 1),
        ),
    ),
    ShopPackageSpec(
        "Kit Encante D",
        "38.00",
        (("enc_w_d", 1), ("enc_a_d", 2), ("gem_d_50", 1), ("crystal_d_100", 1)),
    ),
    ShopPackageSpec(
        "Kit C-Grade",
        "79.00",
        (("ss_c_5k", 1), ("bss_c_2k", 1), ("enc_w_c", 1), ("crystal_c_50", 1), ("gem_c_20", 1)),
    ),
    ShopPackageSpec(
        "Pacote Semanal",
        "75.00",
        (
            ("adena_5m", 1),
            ("ss_ng_50k", 1),
            ("gheal_100", 1),
            ("gcp_50", 1),
            ("bsoe_20", 1),
            ("crystal_d_100", 1),
        ),
    ),
    ShopPackageSpec(
        "Pacote Premium",
        "90.00",
        (("gold_bar", 1), ("col_10", 1), ("adena_5m", 1)),
    ),
)


class IShopAutoconfigService(ABC):
    """Porta de preenchimento idempotente do catálogo da loja (itens avulsos e pacotes).

    Injete no caso de uso staff e registre o adaptador no ShopProvider. Não sobrescreve
    preço, nome, ativação nem composição de registros já existentes.
    """

    @abstractmethod
    def bootstrap(self) -> dict:
        """Cria SKUs e pacotes ausentes e devolve o resumo.

        Retorno: ``{"created": {"items", "packages"}, "items_total", "packages_total"}``.
        """

        raise NotImplementedError
