import pytest
from rest_framework.test import APIClient

from apps.server.application.use_cases import (
    RANKING_LIMIT_DEFAULT,
    RANKING_LIMIT_MAX,
    GetRankingInput,
    GetRankingUseCase,
    clamp_ranking_limit,
    parse_ranking_limit,
)
from apps.server.domain.gateways import ILineageGateway
from apps.server.infrastructure.null_gateway import NullLineageGateway
from common.di.bootstrap import DependencyInjection


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        (None, RANKING_LIMIT_DEFAULT),
        ("", RANKING_LIMIT_DEFAULT),
        ("abc", RANKING_LIMIT_DEFAULT),
        ("10.5", RANKING_LIMIT_DEFAULT),
        ("0", 1),
        ("-3", 1),
        ("999", RANKING_LIMIT_MAX),
        ("7", 7),
    ],
)
def test_parse_ranking_limit_rejects_garbage_and_clamps(raw, expected):
    assert parse_ranking_limit(raw) == expected
    assert clamp_ranking_limit(999) == RANKING_LIMIT_MAX


@pytest.mark.django_db
def test_public_ranking_invalid_limit_does_not_500():
    response = APIClient().get("/api/v1/public/server/rankings/pvp/?limit=abc")
    assert response.status_code == 200
    assert response.data == []


@pytest.mark.django_db
def test_public_ranking_forwards_clamped_limit(monkeypatch):
    gateway = DependencyInjection.root().resolve(ILineageGateway)
    seen: list[int] = []

    def capture(limit=10):
        seen.append(limit)
        return []

    monkeypatch.setattr(gateway, "get_top_pvp", capture)
    api = APIClient()
    assert api.get("/api/v1/public/server/rankings/pvp/?limit=999").status_code == 200
    assert api.get("/api/v1/public/server/rankings/pvp/?limit=abc").status_code == 200
    assert api.get("/api/v1/public/server/rankings/pvp/?limit=-8").status_code == 200
    assert seen == [RANKING_LIMIT_MAX, RANKING_LIMIT_DEFAULT, 1]


def test_use_case_clamps_limit_before_gateway(monkeypatch):
    gateway = NullLineageGateway()
    seen: list[int] = []

    def capture(limit=10):
        seen.append(limit)
        return []

    monkeypatch.setattr(gateway, "get_top_pvp", capture)
    GetRankingUseCase(gateway).execute(GetRankingInput(kind="pvp", limit=400))
    assert seen == [RANKING_LIMIT_MAX]
