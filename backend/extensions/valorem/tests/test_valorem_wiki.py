import pytest

from common.di.bootstrap import DependencyInjection
from extensions.valorem.application.use_cases import GetValoremWikiStatusUseCase
from extensions.valorem.infrastructure.provider import ValoremExtensionProvider


@pytest.fixture(autouse=True)
def setup_valorem_di():
    DependencyInjection.reset()
    DependencyInjection.add_provider(ValoremExtensionProvider())
    yield
    DependencyInjection.reset()


def test_valorem_wiki_status_use_case():
    scope = DependencyInjection.root().create_scope()
    use_case = scope.resolve(GetValoremWikiStatusUseCase)
    status = use_case.execute()

    assert status.active is True
    assert status.version == "1.0.0"
    assert status.total_bosses == 221
    assert status.total_items == 10132
    assert status.total_skills == 8711
