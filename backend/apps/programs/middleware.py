from django.http import JsonResponse

from apps.programs.domain.repositories import ISystemResourceRepository
from common.di.bootstrap import DependencyInjection

# Staff administration remains reachable even when a customer-facing module is off.
# profile uses shared/me/ for the whole session — gated only on the frontend.
RESOURCE_PATHS = {
    "supporters": ("customer/supporters/",),
    "roadmap": ("public/roadmap/",),
    "shop": ("shared/shop/",),
    "wallet": ("shared/wallet/", "customer/payments/"),
    "inventory": ("customer/inventory/",),
    "marketplace": ("customer/marketplace/", "public/marketplace/"),
    "auction": ("customer/auctions/", "public/auctions/"),
    "games": ("customer/games/",),
    "battle-pass": ("customer/games/battle-pass/",),
    "daily-bonus": ("customer/games/daily-bonus/",),
    "fishing": ("customer/games/fishing/",),
    "accounts": (
        "customer/server/accounts/",
        "customer/server/characters/",
        "customer/server/services/",
    ),
    "progress": ("shared/me/progress/", "shared/me/rewards/"),
    "notifications": ("customer/notifications/", "customer/push/"),
    "support": ("customer/support/",),
    "help": ("shared/content/assistant/reply/",),
    "news": ("public/news/", "shared/content/news/"),
    "rankings": ("public/server/rankings/",),
    "wiki": ("public/wiki/",),
    "faq": ("public/faq/", "shared/content/faq/"),
    "downloads": ("public/downloads/",),
    "calendar": ("public/calendar/",),
}


class ResourceGateMiddleware:
    """Bloqueia rotas de recursos desativados em SystemResource.

    Compara prefixos de /api/v1/ com RESOURCE_PATHS e retorna 403 com RESOURCE_DISABLED se
    qualquer recurso correspondente estiver desativado. Rotas administrativas fora desse mapa
    continuam disponíveis para reativação. Adicione novos prefixos ao mapa ao criar
    funcionalidades controláveis.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        prefix = "/api/v1/"
        if request.path.startswith(prefix):
            path = request.path[len(prefix) :]
            codes = [
                code
                for code, paths in RESOURCE_PATHS.items()
                if any(path.startswith(p) for p in paths)
            ]
            if codes:
                resources = (
                    DependencyInjection.root()
                    .create_scope()
                    .resolve(ISystemResourceRepository)
                )
                if resources.any_disabled(codes):
                    return JsonResponse(
                        {
                            "error_code": "RESOURCE_DISABLED",
                            "message": "Este recurso está temporariamente desativado.",
                            "details": {},
                        },
                        status=403,
                    )
        return self.get_response(request)
