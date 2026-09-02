from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class StandardPagination(PageNumberPagination):
    """Paginação por número de página com o envelope padrão do painel.

    Use como ``pagination_class`` em views genéricas ou chame ``paginate_queryset`` e
    ``get_paginated_response`` em APIViews. Retorna count, total_pages, next, previous e
    results; usa 20 itens por padrão e aceita ``page_size`` até 50. Os links preservam os
    parâmetros da consulta.
    """

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 50

    def get_paginated_response(self, data):
        return Response(
            {
                "count": self.page.paginator.count,
                "total_pages": self.page.paginator.num_pages,
                "next": self.get_next_link(),
                "previous": self.get_previous_link(),
                "results": data,
            }
        )
