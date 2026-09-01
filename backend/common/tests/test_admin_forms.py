from decimal import Decimal

import pytest
from django import forms
from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from django.test import RequestFactory
from django.urls import reverse

from apps.accounts.forms import PDLUserChangeForm
from apps.accounts.infrastructure.models import User
from apps.wallet.infrastructure.models import CoinPackage
from common.admin import PDLModelAdmin
from common.forms import PDLAdminFormMixin


class ShowcaseForm(PDLAdminFormMixin, forms.Form):
    title = forms.CharField(label="Título")
    price_brl = forms.DecimalField(label="Preço", max_digits=12, decimal_places=2)
    payload = forms.JSONField(label="Configuração")
    active = forms.BooleanField(label="Ativo", required=False)
    fee_percent = forms.DecimalField(label="Taxa", max_digits=5, decimal_places=2)


def test_form_mixin_enhances_widgets_and_parses_pt_br_money():
    form = ShowcaseForm(
        data={
            "title": "Pacote premium",
            "price_brl": "R$ 1.234,56",
            "payload": '{"tier": "gold"}',
            "active": "on",
            "fee_percent": "10.00",
        }
    )

    assert form.is_valid(), form.errors
    assert form.cleaned_data["price_brl"] == Decimal("1234.56")
    assert "pdl-control" in form.fields["title"].widget.attrs["class"]
    assert form.fields["price_brl"].widget.attrs["data-pdl-mask"] == "money"
    assert form.fields["price_brl"].widget.attrs["data-pdl-kind"] == "money"
    assert "pdl-json" in form.fields["payload"].widget.attrs["class"]
    assert "pdl-check" in form.fields["active"].widget.attrs["class"]
    assert form.fields["fee_percent"].widget.attrs["data-pdl-kind"] == "number"
    assert "pdl_admin/css/forms.css" in str(form.media)
    assert "pdl_admin/js/forms.js" in str(form.media)


def test_registered_admin_builds_pdl_form_for_coin_packages():
    model_admin = admin.site._registry[CoinPackage]
    form_class = model_admin.get_form(RequestFactory().get("/admin/"))
    form = form_class()

    assert isinstance(model_admin, PDLModelAdmin)
    assert issubclass(form_class, PDLAdminFormMixin)
    assert form.fields["code"].widget.attrs["data-pdl-kind"] == "code"
    assert form.fields["price_brl"].widget.attrs["data-pdl-kind"] == "money"
    assert form.fields["active"].widget.attrs["data-pdl-kind"] == "boolean"


def test_every_project_model_admin_uses_the_pdl_form_system():
    request = RequestFactory().get("/admin/")
    request.user = AnonymousUser()
    project_admins = [
        (model, model_admin)
        for model, model_admin in admin.site._registry.items()
        if model.__module__.startswith("apps.")
    ]

    assert len(project_admins) >= 50
    for model, model_admin in project_admins:
        form_class = model_admin.get_form(request)
        assert isinstance(model_admin, PDLModelAdmin), model._meta.label
        assert issubclass(form_class, PDLAdminFormMixin), model._meta.label


def test_user_change_form_uses_safe_password_and_compact_special_widgets():
    form = PDLUserChangeForm(instance=User(username="preview", email="preview@example.com"))

    assert not isinstance(form.fields["password"].widget, forms.widgets.Input)
    assert "pdl-static-widget" in form.fields["password"].widget.attrs["class"]
    assert "pdl-check" in form.fields["is_superuser"].widget.attrs["class"]
    assert "pdl-control" not in form.fields["is_superuser"].widget.attrs["class"]


def test_user_admin_add_form_uses_password_confirmation_fields():
    request = RequestFactory().get("/admin/accounts/user/add/")
    request.user = AnonymousUser()
    form_class = admin.site._registry[User].get_form(request)

    assert {"password1", "password2"}.issubset(form_class.base_fields)
    assert "password" not in form_class.base_fields


@pytest.mark.django_db
def test_admin_add_page_includes_pdl_form_assets_and_markup(client):
    user_model = get_user_model()
    user = user_model.objects.create_superuser(
        username="admin_forms",
        email="admin-forms@example.com",
        password="test-password",
    )
    client.force_login(user)

    response = client.get(reverse("admin:wallet_coinpackage_add"))
    html = response.content.decode()

    assert response.status_code == 200
    assert "/static/pdl_admin/css/forms.css" in html
    assert "/static/pdl_admin/js/forms.js" in html
    assert 'data-pdl-kind="money"' in html
    assert "pdl-control" in html
