from datetime import timedelta
from uuid import uuid4

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.infrastructure.models import User
from apps.content.infrastructure.models import DenkynhoCareAction, DenkynhoProfile

PET_URL = "/api/v1/shared/content/assistant/pet/"


def _user(name: str) -> User:
    return User.objects.create_user(name, f"{name}@example.com", password="Strong-pass-123")


@pytest.mark.django_db
def test_denkynho_profile_is_created_for_the_authenticated_user_only():
    owner = _user("denk-owner")
    other = _user("denk-other")
    api = APIClient()

    assert api.get(PET_URL).status_code in {401, 403}

    api.force_authenticate(owner)
    own = api.get(PET_URL)
    assert own.status_code == 200
    assert {key: own.data[key] for key in ("level", "experience", "experience_next", "attributes", "emotion")} == {
        "level": 1,
        "experience": 0,
        "experience_next": 100,
        "attributes": {"satiety": 75, "energy": 75, "happiness": 75, "hygiene": 75},
        "emotion": {"id": "calm", "pose": "01-boas-vindas", "idle_pose": "01-boas-vindas", "source": "default"},
    }

    DenkynhoProfile.objects.filter(user=owner).update(level=3, experience=21)
    api.force_authenticate(other)
    other_response = api.get(PET_URL)
    assert other_response.status_code == 200
    assert other_response.data["level"] == 1
    assert other_response.data["experience"] == 0
    assert DenkynhoProfile.objects.filter(user=other).count() == 1


@pytest.mark.django_db
def test_feed_updates_bounded_attributes_and_experience_once_per_idempotency_key():
    user = _user("denk-feed")
    api = APIClient()
    api.force_authenticate(user)
    request_id = uuid4()

    first = api.post(PET_URL, {"action": "feed", "idempotency_key": str(request_id)}, format="json")
    second = api.post(PET_URL, {"action": "feed", "idempotency_key": str(request_id)}, format="json")

    assert first.status_code == second.status_code == 200
    assert first.data["replayed"] is False
    assert second.data["replayed"] is True
    assert first.data["xp_gained"] == second.data["xp_gained"] == 12
    assert first.data["attributes"] == {"satiety": 100, "energy": 75, "happiness": 80, "hygiene": 75}
    assert second.data["experience"] == 12
    assert DenkynhoCareAction.objects.filter(profile__user=user).count() == 1


@pytest.mark.django_db
def test_pet_actions_validate_contract_limits_and_basic_needs():
    user = _user("denk-limits")
    profile = DenkynhoProfile.objects.create(user=user, satiety=7, energy=11, happiness=60, hygiene=100)
    api = APIClient()
    api.force_authenticate(user)

    invalid = api.post(PET_URL, {"action": "dance", "idempotency_key": str(uuid4())}, format="json")
    malformed = api.post(PET_URL, {"action": "feed", "idempotency_key": "not-a-uuid"}, format="json")
    exhausted = api.post(PET_URL, {"action": "play", "idempotency_key": str(uuid4())}, format="json")
    clean = api.post(PET_URL, {"action": "care", "idempotency_key": str(uuid4())}, format="json")

    assert invalid.status_code == malformed.status_code == exhausted.status_code == clean.status_code == 400
    assert "descansar" in exhausted.data["message"]
    assert "bem cuidado" in clean.data["message"]
    profile.refresh_from_db()
    assert profile.experience == 0
    assert DenkynhoCareAction.objects.filter(profile=profile).count() == 0


@pytest.mark.django_db
def test_pet_decays_over_elapsed_half_hours_and_reusing_key_for_another_action_conflicts():
    user = _user("denk-decay")
    profile = DenkynhoProfile.objects.create(
        user=user,
        last_decay_at=timezone.now() - timedelta(hours=1),
    )
    api = APIClient()
    api.force_authenticate(user)

    state = api.get(PET_URL)
    assert state.status_code == 200
    assert state.data["attributes"] == {"satiety": 67, "energy": 69, "happiness": 71, "hygiene": 71}

    request_id = uuid4()
    assert api.post(PET_URL, {"action": "sleep", "idempotency_key": str(request_id)}, format="json").status_code == 200
    conflict = api.post(PET_URL, {"action": "feed", "idempotency_key": str(request_id)}, format="json")
    assert conflict.status_code == 409
    assert conflict.data["error_code"] == "CONFLICT"
    profile.refresh_from_db()
    assert profile.energy == 100
    assert profile.satiety == 67


@pytest.mark.django_db
def test_expired_empathy_falls_back_to_needs_on_read():
    user = _user("denk-expired")
    DenkynhoProfile.objects.create(
        user=user,
        empathy="sad",
        empathy_expires_at=timezone.now() - timedelta(minutes=1),
    )
    api = APIClient()
    api.force_authenticate(user)

    state = api.get(PET_URL)
    assert state.data["emotion"] == {
        "id": "calm", "pose": "01-boas-vindas", "idle_pose": "01-boas-vindas", "source": "default",
    }
    profile = DenkynhoProfile.objects.get(user=user)
    assert profile.empathy == ""
    assert profile.empathy_expires_at is None


@pytest.mark.django_db
def test_pet_emotion_follows_urgent_needs_and_stays_private_to_the_owner():
    hungry = _user("denk-hungry")
    other = _user("denk-fed")
    DenkynhoProfile.objects.filter(user=hungry).delete()
    DenkynhoProfile.objects.create(user=hungry, satiety=8, energy=80, happiness=80, hygiene=80)
    api = APIClient()

    api.force_authenticate(hungry)
    own = api.get(PET_URL)
    assert own.status_code == 200
    assert own.data["emotion"] == {"id": "sad", "pose": "07-triste", "idle_pose": "07-triste", "source": "needs"}

    api.force_authenticate(other)
    other_state = api.get(PET_URL)
    assert other_state.data["emotion"]["id"] == "calm"
    assert other_state.data["attributes"]["satiety"] == 75
