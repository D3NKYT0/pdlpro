import sqlite3
from unittest.mock import Mock

import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from rest_framework.test import APIClient

from apps.server.application.use_cases import (
    RunPublicLineageQueryInput,
    RunPublicLineageQueryUseCase,
)
from apps.server.domain.bosses import IBossCatalog, INpcCatalog
from apps.server.domain.gateways import ILineageGateway
from apps.server.infrastructure.boss_catalog import DjangoBossCatalog, RankingBoss
from apps.server.infrastructure.lineage.catalog import LineageQueryCatalog


@pytest.mark.django_db
def test_custom_epic_can_use_raid_respawn_and_inactive_is_hidden():
    RankingBoss.objects.create(npc_id=90001, name="Custom Dragon", category="epic", source="raid")
    RankingBoss.objects.create(npc_id=29001, name="Hidden", active=False)
    RankingBoss.objects.create(npc_id=90002, name="No spawn", category="raid", source="raid")
    gateway = Mock(spec=ILineageGateway)
    gateway.query.side_effect = lambda name, params: {
        "grandboss_status": [{"boss_id": 29001, "respawn": 0}, {"boss_id": 29020, "respawn": 123}],
        "raidboss_status": [{"boss_id": 90001, "respawn": 1999999999000}],
    }[name]
    npcs = Mock(spec=INpcCatalog)
    npcs.get.return_value = None
    use_case = RunPublicLineageQueryUseCase(gateway, DjangoBossCatalog(), npcs)
    assert use_case.execute(RunPublicLineageQueryInput("grandboss_status")) == [
        {"boss_id": 29020, "respawn": 123},
        {"boss_id": 90001, "name": "Custom Dragon", "respawn": 1999999999000},
    ]
    assert use_case.execute(RunPublicLineageQueryInput("raidboss_status")) == [
        {"boss_id": 90002, "name": "No spawn", "respawn": None},
    ]
    assert use_case.execute(RunPublicLineageQueryInput("raidboss_status")) == [
        {"boss_id": 90002, "name": "No spawn", "respawn": None},
    ]


@pytest.mark.django_db
@pytest.mark.parametrize("field,value", [("npc_id", 0), ("npc_id", -1), ("npc_id", 2147483648),
                                        ("category", "invalid"), ("source", "invalid"), ("name", "")])
def test_boss_catalog_validates_inputs(field, value):
    boss = RankingBoss(npc_id=1, name="Test")
    setattr(boss, field, value)
    with pytest.raises(ValidationError):
        boss.full_clean()


@pytest.mark.django_db
def test_duplicate_npc_rejected():
    RankingBoss.objects.create(npc_id=1, name="First")
    with pytest.raises(IntegrityError), transaction.atomic():
        RankingBoss.objects.create(npc_id=1, name="Duplicate", category="raid")


@pytest.mark.parametrize("dialect", ["lucerav2", "dreamv3", "mobius"])
def test_raid_query_returns_all_npcs_without_site_bosses(dialect):
    with sqlite3.connect(":memory:") as db:
        db.execute("CREATE TABLE raidboss_status (id INTEGER, respawn_delay INTEGER)")
        db.executemany("INSERT INTO raidboss_status VALUES (?, ?)", [(90001, 0), (90002, 1999999999)])
        assert db.execute(LineageQueryCatalog.load(dialect)["raidboss_status"]).fetchall() == [
            (90002, 1999999999), (90001, 0),
        ]


@pytest.mark.django_db
def test_public_api_reads_catalog_without_authentication(mocker):
    RankingBoss.objects.create(npc_id=90001, name="Custom Raid", category="raid", source="raid")
    mocker.patch("apps.server.infrastructure.null_gateway.NullLineageGateway.query",
                 return_value=[{"boss_id": 90001, "respawn": 0}])
    response = APIClient().get("/api/v1/public/server/world/raidboss_status/")
    assert response.status_code == 200
    assert response.data == [{"boss_id": 90001, "name": "Custom Raid", "respawn": 0}]


@pytest.mark.django_db
@pytest.mark.parametrize("role", ["anonymous", "player", "staff", "superuser"])
def test_admin_catalog_requires_model_permissions(client, role):
    if role != "anonymous":
        user = get_user_model().objects.create_user(
            username=role, email=f"{role}@example.invalid", password="TestPassword1", is_staff=role in {"staff", "superuser"},
            is_superuser=role == "superuser",
        )
        client.force_login(user)
    response = client.get("/admin/server/rankingboss/add/")
    assert response.status_code == (200 if role == "superuser" else 403 if role == "staff" else 302)


def test_queries_outside_allowlist_never_reach_gateway():
    gateway = Mock(spec=ILineageGateway)
    from common.architecture.exceptions import ValidationDomainError
    with pytest.raises(ValidationDomainError):
        RunPublicLineageQueryUseCase(gateway, Mock(spec=IBossCatalog), Mock(spec=INpcCatalog)).execute(
            RunPublicLineageQueryInput("delete_item_stack")
        )
    gateway.query.assert_not_called()
