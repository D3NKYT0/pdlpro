import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.server.application.account_use_cases import (
    AccountActor,
    CreateCharacterInput,
    CreateCharacterUseCase,
)
from apps.server.domain.gateways import ILineageGateway
from common.architecture.exceptions import ValidationDomainError
from common.di.bootstrap import DependencyInjection

User = get_user_model()


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def player(db):
    return User.objects.create_user(username="hero", email="hero@pdl.dev", password="Secret123")


@pytest.fixture
def actor(player):
    return AccountActor(
        user_id=player.id,
        username=player.username,
        email=player.email,
        is_staff=False,
        is_superuser=False,
        is_staff_member=False,
    )


@pytest.mark.django_db
def test_create_character_success(actor, player):
    container = DependencyInjection.root()
    gateway = container.resolve(ILineageGateway)
    gateway.register_account("myaccount", "password123", player.email)
    gateway.link_account("myaccount", str(player.id))

    use_case = container.resolve(CreateCharacterUseCase)
    created = use_case.execute(
        CreateCharacterInput(
            actor=actor,
            login="myaccount",
            name="SuperHero",
            race=0,
            class_id=0,
            sex=0,
            hair_style=1,
            hair_color=2,
            face=0,
        )
    )

    assert created.name == "SuperHero"
    assert created.level == 1
    assert created.class_id == 0
    assert created.sex == 0

    chars = gateway.list_characters("myaccount")
    assert any(c.name == "SuperHero" for c in chars)


@pytest.mark.django_db
def test_create_character_invalid_nick(actor, player):
    container = DependencyInjection.root()
    gateway = container.resolve(ILineageGateway)
    gateway.register_account("myaccount", "password123", player.email)
    gateway.link_account("myaccount", str(player.id))

    use_case = container.resolve(CreateCharacterUseCase)
    with pytest.raises(ValidationDomainError):
        use_case.execute(
            CreateCharacterInput(
                actor=actor,
                login="myaccount",
                name="X",  # too short
                race=0,
                class_id=0,
                sex=0,
            )
        )


@pytest.mark.django_db
def test_create_character_incompatible_class(actor, player):
    container = DependencyInjection.root()
    gateway = container.resolve(ILineageGateway)
    gateway.register_account("myaccount", "password123", player.email)
    gateway.link_account("myaccount", str(player.id))

    use_case = container.resolve(CreateCharacterUseCase)
    with pytest.raises(ValidationDomainError, match="incompatível"):
        use_case.execute(
            CreateCharacterInput(
                actor=actor,
                login="myaccount",
                name="ElvenWarrior",
                race=0,  # Human
                class_id=18,  # Elven Fighter
                sex=0,
            )
        )


@pytest.mark.django_db
def test_create_character_api_endpoint(api, player):
    api.force_authenticate(user=player)
    container = DependencyInjection.root()
    gateway = container.resolve(ILineageGateway)
    gateway.register_account("apiacc", "password123", player.email)
    gateway.link_account("apiacc", str(player.id))

    resp = api.post(
        "/api/v1/customer/server/characters/create/",
        {
            "login": "apiacc",
            "name": "ApiHero",
            "race": 1,
            "class_id": 18,
            "sex": 1,
            "hair_style": 3,
            "hair_color": 1,
            "face": 2,
        },
        format="json",
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "ApiHero"
    assert data["class_id"] == 18
    assert data["sex"] == 1
