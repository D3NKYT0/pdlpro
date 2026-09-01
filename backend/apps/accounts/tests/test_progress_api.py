import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.accounts.application.achievement_catalog import ACHIEVEMENTS
from apps.accounts.application.achievement_rules import build_achievement_rules
from apps.accounts.infrastructure.models import Achievement
from apps.games.infrastructure.models import SpinHistory

User = get_user_model()


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def user(db):
    return User.objects.create_user(username="hero", email="hero@pdl.dev", password="Secret123")


@pytest.mark.django_db
def test_catalog_matches_unlock_rules():
    assert {code for code, _, _ in ACHIEVEMENTS} == set(build_achievement_rules())


@pytest.mark.django_db
def test_progress_lists_locked_and_unlocked_achievements(api, user):
    api.force_authenticate(user=user)
    response = api.get("/api/v1/shared/me/progress/")
    assert response.status_code == 200, response.data
    codes = {row["code"] for row in response.data["achievements"]}
    assert "primeiro_login" in codes
    assert "primeiro_spin" in codes
    assert response.data["total_achievements"] == len(ACHIEVEMENTS)
    login = next(row for row in response.data["achievements"] if row["code"] == "primeiro_login")
    spin = next(row for row in response.data["achievements"] if row["code"] == "primeiro_spin")
    assert login["unlocked"] is True
    assert spin["unlocked"] is False
    assert response.data["unlocked_count"] >= 1


@pytest.mark.django_db
def test_progress_unlocks_primeiro_spin(api, user):
    Achievement.objects.get_or_create(code="primeiro_spin", defaults={"name": "Primeiro Giro", "description": "Giro"})
    SpinHistory.objects.create(user=user, seed=1)
    api.force_authenticate(user=user)
    response = api.get("/api/v1/shared/me/progress/")
    spin = next(row for row in response.data["achievements"] if row["code"] == "primeiro_spin")
    assert spin["unlocked"] is True
    assert "primeiro_spin" in response.data["unlocked_now"]
