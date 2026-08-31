import pytest

from apps.server.domain.gateways import ILineageGateway
from apps.server.infrastructure.null_gateway import NullLineageGateway
from common.di.bootstrap import DependencyInjection


@pytest.fixture(autouse=True)
def reset_in_memory_lineage():
    try:
        gateway = DependencyInjection.root().resolve(ILineageGateway)
    except Exception:
        yield
        return
    if isinstance(gateway, NullLineageGateway):
        gateway._accounts.clear()
        gateway._characters.clear()
        gateway._items.clear()
        gateway._next_char_id = 1
    yield
