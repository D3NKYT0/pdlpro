import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse

from apps.wallet.infrastructure.models import CoinPackage


@pytest.mark.django_db
def test_login_loads_shared_buttons_without_replacing_jazzmin_form(client):
    response = client.get(reverse("admin:login"))
    assert response.status_code == 200
    assert b"pdl_admin/css/buttons.css" in response.content
    assert b"pdl_admin/js/buttons.js" in response.content
    assert b'name="csrfmiddlewaretoken"' in response.content
    assert b'name="password"' in response.content


@pytest.mark.django_db
@pytest.mark.parametrize("is_staff,is_active,allowed", [(False, True, False), (True, False, False), (True, True, True)])
def test_catalog_requires_active_staff(client, is_staff, is_active, allowed):
    user = get_user_model().objects.create_user(username="component-reader", email="reader@example.com", is_staff=is_staff, is_active=is_active)
    client.force_login(user)
    response = client.get(reverse("admin-components"))
    assert response.status_code == (200 if allowed else 302)
    if allowed:
        assert "Componentes de interface" in response.content.decode()
        assert b"pdl_admin/css/buttons.css" in response.content
        assert client.post(reverse("admin-components")).status_code == 405


def test_catalog_redirects_visitor_to_admin_login(client):
    response = client.get(reverse("admin-components"))
    assert response.status_code == 302
    assert "/admin/login/" in response.url


@pytest.mark.django_db
def test_admin_save_and_continue_keeps_submit_action_and_validation(client):
    user = get_user_model().objects.create_superuser(username="component-editor", email="editor@example.com", password="test-password")
    client.force_login(user)
    data = {"code": "ui-test", "name": "Pacote", "coins": "100.00", "price_brl": "10,00", "price_usd": "2,00", "sort_order": "0", "active": "on", "_continue": "Salvar e continuar"}
    invalid = client.post(reverse("admin:wallet_coinpackage_add"), {**data, "name": ""})
    assert invalid.status_code == 200
    assert not CoinPackage.objects.filter(code="ui-test").exists()
    response = client.post(reverse("admin:wallet_coinpackage_add"), data)
    assert response.status_code == 302, response.context["adminform"].form.errors
    item = CoinPackage.objects.get(code="ui-test")
    assert response.status_code == 302
    assert response.url == reverse("admin:wallet_coinpackage_change", args=[item.pk])
