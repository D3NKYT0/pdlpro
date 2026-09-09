from apps.server.infrastructure.lineage.item_catalog import item_catalog_scope


class ItemCatalogScopeMiddleware:
    """Compartilha o catálogo de itens durante uma requisição.

    Envolve o processamento em ``item_catalog_scope()`` para que consultas a metadados
    reutilizem o contexto do catálogo e restaurem o anterior ao sair, inclusive quando uma
    exceção interrompe a resposta.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        with item_catalog_scope():
            return self.get_response(request)
