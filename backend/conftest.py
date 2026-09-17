import pytest

from apps.server.domain.gateways import ILineageGateway
from apps.server.infrastructure.null_gateway import NullLineageGateway
from common.di.bootstrap import DependencyInjection
from common.di.exceptions import UnregisteredServiceError


@pytest.fixture(autouse=True)
def reset_in_memory_lineage():
    try:
        gateway = DependencyInjection.root().resolve(ILineageGateway)
    except UnregisteredServiceError:
        yield
        return
    if isinstance(gateway, NullLineageGateway):
        gateway._accounts.clear()
        gateway._characters.clear()
        gateway._items.clear()
        gateway._skills.clear()
        gateway._stores.clear()
        gateway._store_items.clear()
        gateway._next_char_id = 1
    yield
