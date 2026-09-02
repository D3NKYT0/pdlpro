"""O acesso à conta não autoriza consultar personagens de outra conta."""
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.server.domain.gateways import GameItem, ILineageGateway
from common.di.bootstrap import DependencyInjection

pytestmark = pytest.mark.django_db


@pytest.mark.parametrize("resource", ["items", "equipment"])
def test_foreign_character_is_not_visible_even_with_own_login(resource):
    user = get_user_model().objects.create_user(username="owner", email="owner@test.dev")
    client = APIClient()
    client.force_authenticate(user)
    assert client.post("/api/v1/customer/server/accounts/register/", {"password": "Secret123"}, format="json").status_code == 200
    gateway = DependencyInjection.root().resolve(ILineageGateway)
    foreign = gateway.seed_character("stranger", "Private", items=[GameItem(57, "Adena", 999, 0)])
    response = client.get(f"/api/v1/customer/inventory/characters/{foreign.char_id}/{resource}/?login=owner")
    assert response.status_code == 404, response.data


@pytest.mark.parametrize("resource", ["items", "equipment"])
def test_own_character_remains_accessible(resource):
    user = get_user_model().objects.create_user(username="owner", email="owner@test.dev")
    client = APIClient()
    client.force_authenticate(user)
    assert client.post("/api/v1/customer/server/accounts/register/", {"password": "Secret123"}, format="json").status_code == 200
    gateway = DependencyInjection.root().resolve(ILineageGateway)
    char = gateway.seed_character("owner", "Mine", items=[GameItem(57, "Adena", 10, 0)])
    response = client.get(f"/api/v1/customer/inventory/characters/{char.char_id}/{resource}/")
    assert response.status_code == 200, response.data
