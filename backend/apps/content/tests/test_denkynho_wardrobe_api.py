from uuid import uuid4

import pytest
from rest_framework.test import APIClient

from apps.accounts.infrastructure.models import User
from apps.content.application.denkynho import CareDenkynhoInput, CareDenkynhoUseCase
from apps.content.application.wardrobe import EquipDenkynhoInput, EquipDenkynhoUseCase
from apps.content.infrastructure.models import DenkynhoCareAction, DenkynhoProfile
from common.architecture.exceptions import ValidationDomainError

PET_URL = "/api/v1/shared/content/assistant/pet/"
WARDROBE_URL = PET_URL + "wardrobe/"


@pytest.fixture
def owner(db):
    return User.objects.create_user("wardrobe-owner", "wardrobe-owner@example.com", password="test-pass")


@pytest.fixture
def api(owner):
    client = APIClient()
    client.force_authenticate(owner)
    return client


def test_wardrobe_requires_authentication_and_lists_unlock_levels(owner):
    anonymous = APIClient()
    assert anonymous.get(WARDROBE_URL).status_code in {401, 403}
    assert anonymous.patch(WARDROBE_URL, {"slot": "accessory", "item_id": "star-pin"}, format="json").status_code in {401, 403}
    anonymous.force_authenticate(owner)
    profile = anonymous.get(WARDROBE_URL).data
    assert profile["appearance"] == {"accessory": "", "outfit": "", "object": ""}
    assert [(item["id"], item["level"], item["unlocked"]) for item in profile["unlocks"]] == [
        ("star-pin", 2, False), ("dance", 3, False), ("golden-scarf", 4, False), ("lantern", 5, False),
    ]
    assert "dance" not in profile["available_actions"]


@pytest.mark.parametrize("flags", [{}, {"is_staff": True}, {"is_superuser": True}])
def test_equipping_is_free_repeatable_and_always_owned_by_session(owner, api, flags):
    for key, value in flags.items():
        setattr(owner, key, value)
    owner.save()
    other = User.objects.create_user("wardrobe-other", "wardrobe-other@example.com", password="test-pass")
    other_profile = DenkynhoProfile.objects.create(user=other, level=5, appearance={"object": "lantern"})
    profile = DenkynhoProfile.objects.create(user=owner, level=5, experience=29)
    for slot, item in [("accessory", "star-pin"), ("outfit", "golden-scarf"), ("object", "lantern")]:
        payload = {"slot": slot, "item_id": item, "user_id": str(other.id)}
        first = api.patch(WARDROBE_URL, payload, format="json")
        second = api.patch(WARDROBE_URL, payload, format="json")
        assert first.status_code == second.status_code == 200
        assert second.data["appearance"][slot] == item
        assert second.data["experience"] == 29
    assert api.get(PET_URL).data["appearance"] == {"accessory": "star-pin", "outfit": "golden-scarf", "object": "lantern"}
    removed = api.patch(WARDROBE_URL, {"slot": "accessory", "item_id": ""}, format="json")
    assert removed.data["appearance"]["accessory"] == ""
    profile.refresh_from_db()
    other_profile.refresh_from_db()
    assert profile.appearance["outfit"] == "golden-scarf"
    assert other_profile.appearance == {"object": "lantern"}
    assert DenkynhoCareAction.objects.count() == 0


@pytest.mark.parametrize("payload", [
    {"slot": "accessory", "item_id": "star-pin"},
    {"slot": "accessory", "item_id": "lantern"},
    {"slot": "accessory", "item_id": "unknown"},
    {"slot": "interaction", "item_id": "dance"},
    {"slot": "object"}, {"slot": "object", "item_id": "x" * 41},
])
def test_wardrobe_rejects_locked_wrong_slot_and_invalid_items_without_changes(owner, api, payload):
    profile = DenkynhoProfile.objects.create(user=owner)
    assert api.patch(WARDROBE_URL, payload, format="json").status_code == 400
    profile.refresh_from_db()
    assert profile.appearance == {}
    assert profile.experience == 0


def test_level_up_exposes_new_unlocks_and_replay_does_not_reannounce(owner, api):
    profile = DenkynhoProfile.objects.create(user=owner, experience=95, satiety=90)
    payload = {"action": "feed", "idempotency_key": str(uuid4())}
    first = api.post(PET_URL, payload, format="json")
    assert first.status_code == 200
    assert first.data["level"] == 2
    assert first.data["experience"] == 7
    assert first.data["level_up"] is True
    assert first.data["unlocked"] == ["star-pin"]
    assert first.data["attributes_gained"] == {"satiety": 10, "happiness": 5}
    second = api.post(PET_URL, payload, format="json")
    assert second.data["replayed"] is True
    assert second.data["level_up"] is False
    assert second.data["unlocked"] == []
    assert second.data["attributes_gained"] == {}
    assert DenkynhoCareAction.objects.filter(profile=profile).count() == 1


def test_dance_unlock_consumes_energy_and_satiety_and_is_idempotent(owner, api):
    profile = DenkynhoProfile.objects.create(user=owner, level=3, energy=10, satiety=5, happiness=90)
    assert "dance" in api.get(PET_URL).data["available_actions"]
    key = str(uuid4())
    first = api.post(PET_URL, {"action": "dance", "idempotency_key": key}, format="json")
    assert first.status_code == 200
    assert first.data["xp_gained"] == 16
    assert first.data["attributes"] == {"energy": 0, "satiety": 0, "happiness": 100, "hygiene": 75}
    second = api.post(PET_URL, {"action": "dance", "idempotency_key": key}, format="json")
    assert second.data["experience"] == 16
    assert second.data["replayed"] is True
    assert api.post(PET_URL, {"action": "feed", "idempotency_key": key}, format="json").status_code == 409
    assert DenkynhoCareAction.objects.filter(profile=profile).count() == 1


@pytest.mark.parametrize("attributes, message", [
    ({"level": 2}, "nível 3"), ({"energy": 9}, "descansar"),
    ({"satiety": 4}, "comer"), ({"happiness": 100}, "feliz"),
])
def test_dance_rejects_locked_insufficient_needs_and_saturation(owner, api, attributes, message):
    profile = DenkynhoProfile.objects.create(user=owner, **{"level": 3, **attributes})
    response = api.post(PET_URL, {"action": "dance", "idempotency_key": str(uuid4())}, format="json")
    assert response.status_code == 400
    assert message in response.data["message"]
    profile.refresh_from_db()
    assert profile.experience == 0
    assert not DenkynhoCareAction.objects.filter(profile=profile).exists()


def test_care_rolls_back_level_and_unlock_on_receipt_failure(owner, mocker):
    profile = DenkynhoProfile.objects.create(user=owner, experience=95)
    mocker.patch.object(DenkynhoCareAction.objects, "create", side_effect=RuntimeError("receipt failure"))
    with pytest.raises(RuntimeError, match="receipt failure"):
        CareDenkynhoUseCase().execute(CareDenkynhoInput(owner.id, "feed", uuid4()))
    profile.refresh_from_db()
    assert (profile.level, profile.experience, profile.satiety) == (1, 95, 75)


def test_wardrobe_rolls_back_failed_persistence_and_rejects_invalid_use_case_slot(owner, mocker):
    profile = DenkynhoProfile.objects.create(user=owner, level=2)
    original = DenkynhoProfile.save

    def save_then_fail(instance, **kwargs):
        original(instance, **kwargs)
        raise RuntimeError("storage failure")

    mocker.patch.object(DenkynhoProfile, "save", save_then_fail)
    with pytest.raises(RuntimeError, match="storage failure"):
        EquipDenkynhoUseCase().execute(EquipDenkynhoInput(owner.id, "accessory", "star-pin"))
    profile.refresh_from_db()
    assert profile.appearance == {}
    with pytest.raises(ValidationDomainError):
        EquipDenkynhoUseCase().execute(EquipDenkynhoInput(owner.id, "interaction", "dance"))


def test_invalid_stored_appearance_is_not_exposed(owner, api):
    profile = DenkynhoProfile.objects.create(user=owner, level=2, appearance={"accessory": "lantern", "outfit": "star-pin", "object": "unknown"})
    assert api.get(PET_URL).data["appearance"] == {"accessory": "", "outfit": "", "object": ""}
    profile.appearance = ["invalid"]
    profile.save()
    assert api.get(PET_URL).data["appearance"] == {"accessory": "", "outfit": "", "object": ""}


def test_unknown_care_is_rejected_at_application_boundary(owner):
    with pytest.raises(ValidationDomainError):
        CareDenkynhoUseCase().execute(CareDenkynhoInput(owner.id, "unknown", uuid4()))
