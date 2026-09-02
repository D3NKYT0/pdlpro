"""Explicit response adapter for APIs that expose current L2 items.

Does not mutate persistent labels, commercial values, quantities, or IDs. Historical
observation endpoints intentionally do not inherit this adapter.
"""
from apps.server.infrastructure.lineage.item_catalog import item_metadata
from common.views import InjectedAPIView


def with_item_metadata(value):
    if isinstance(value, (list, tuple)):
        return [with_item_metadata(row) for row in value]
    if not isinstance(value, dict):
        return value
    result = {key: with_item_metadata(row) for key, row in value.items()}
    item_id = result.get("item_id", result.get("coin_id"))
    # UUIDs here can be shop product IDs, never L2 IDs. Booleans are not IDs.
    if type(item_id) not in (int, str) or not str(item_id).isascii() or not str(item_id).isdigit():
        return result
    if not 0 < int(item_id) <= 2147483647:
        return result
    metadata = item_metadata(int(item_id))
    result["item_metadata"] = metadata
    result["icon_url"] = metadata["icon_url"]
    for key in ("name", "item_name"):
        if key in result:
            result[key] = metadata["name"]
    return result


class ItemCatalogAPIView(InjectedAPIView):
    """Base de resposta HTTP que acrescenta metadados do catálogo aos itens retornados.

    Usa os handlers herdados ou associados nesta classe. As opções abaixo especializam o
    comportamento da view base. Usa as permissões herdadas da base ou definidas nos padrões do
    DRF.
    """

    def finalize_response(self, request, response, *args, **kwargs):
        if 200 <= response.status_code < 300 and hasattr(response, "data"):
            response.data = with_item_metadata(response.data)
        return super().finalize_response(request, response, *args, **kwargs)
