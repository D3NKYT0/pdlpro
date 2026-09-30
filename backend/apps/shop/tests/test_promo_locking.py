import pytest
from django.db.backends.postgresql.base import DatabaseWrapper

from apps.shop.infrastructure.repositories import DjangoShopRepository
from apps.shop.models import PromotionCode


@pytest.mark.django_db
def test_find_active_promo_locks_only_self_table_for_postgresql():
    """Garante que a busca de cupom com lock especifica of=('self',),

    evitando erro de outer join no PostgreSQL devido ao relacionamento anulável supporter.
    """
    repo = DjangoShopRepository()
    rows = repo.find_active_promo_by_code("PROMO10", lock=True)
    assert rows is None

    locked_qs = (
        PromotionCode.objects.select_for_update(of=("self",))
        .select_related("supporter")
        .filter(code="PROMO10", active=True)
    )

    assert locked_qs.query.select_for_update is True
    assert locked_qs.query.select_for_update_of == ("self",)

    pg_conn = DatabaseWrapper({"ENGINE": "django.db.backends.postgresql"})
    compiler = locked_qs.query.get_compiler(using=pg_conn.alias, connection=pg_conn)
    compiler.setup_query()
    of_args = compiler.get_select_for_update_of_arguments()

    assert of_args == ['"shop_promotioncode"'], (
        f"Esperado bloquear apenas 'shop_promotioncode', mas obteve: {of_args}"
    )
