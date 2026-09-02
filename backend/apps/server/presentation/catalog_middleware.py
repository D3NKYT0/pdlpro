from apps.server.infrastructure.lineage.item_catalog import item_catalog_scope


class ItemCatalogScopeMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        with item_catalog_scope():
            return self.get_response(request)
