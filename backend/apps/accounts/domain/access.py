"""Catálogo puro de papéis e capacidades; não concede acesso por is_staff.

O papel principal e os grupos ``PDL:<slug>`` são combinados sem hierarquia.
Concessões adicionais são explícitas e administradas pelo superadministrador.
"""

AREAS = (
    "support", "moderation", "accounts", "content", "games", "commerce",
    "finance", "programs", "resources", "settings", "notifications",
    "operational_reports", "financial_reports", "audit", "metrics", "items", "docs",
)
CAPABILITIES = frozenset(f"{area}.{action}" for area in AREAS for action in ("view", "manage"))
ROLE_CAPABILITIES = {
    "player": frozenset(),
    "supporter": frozenset(),
    "promoter": frozenset(),
    "partner": frozenset(),
    "support": frozenset({"support.view", "support.manage", "accounts.view"}),
    "moderator": frozenset({"moderation.view", "moderation.manage"}),
    "editor": frozenset({"content.view", "content.manage"}),
    "staff": frozenset({"support.view", "support.manage", "operational_reports.view"}),
    "admin": CAPABILITIES,
}
ROLE_GROUP_PREFIX = "PDL:"
CONTENT_MODELS = ("news", "faq", "downloadlink", "wikipage", "calendarevent", "banner")
EDITORIAL_ADMIN_MODELS = frozenset({*(f"content.{model}" for model in CONTENT_MODELS), "programs.roadmapentry"})
# Caminhos de propriedade auditados. Modelos novos falham fechados para contas sem capacidades staff.
OWNED_ADMIN_MODELS = {
    "accounts.gamerprofile": "user", "accounts.userachievement": "user",
    "accounts.rewardclaim": "user", "server.managedlineageaccount": "user",
    "server.accountlinkslot": "user", "wallet.wallet": "user",
    "wallet.wallettransaction": "wallet__user", "payment.pedidopagamento": "user",
    "shop.cart": "user", "shop.cartitem": "cart__user", "shop.cartpackage": "cart__user",
    "shop.shoppurchase": "user", "programs.supporter": "user",
    "programs.commission": "supporter__user", "programs.commissionpayout": "supporter__user",
    "support.ticket": "user", "support.ticketmessage": "ticket__user",
}


def capability_permission(capability: str) -> str:
    """Nome da permissão Django correspondente a uma capacidade conhecida."""
    if capability not in CAPABILITIES:
        raise ValueError("Capacidade desconhecida")
    return "accounts." + capability.replace(".", "_")


def role_permissions(roles) -> set[str]:
    """Concessões dos templates de papéis; papel desconhecido não concede nada."""
    capabilities = set().union(*(ROLE_CAPABILITIES.get(role, ()) for role in roles))
    permissions = {capability_permission(capability) for capability in capabilities}
    # CRUD editorial do admin usa a mesma intenção das APIs de conteúdo.
    if "content.view" in capabilities:
        permissions.update(f"content.view_{model}" for model in CONTENT_MODELS)
    if "content.manage" in capabilities:
        permissions.update(f"content.{action}_{model}" for model in CONTENT_MODELS for action in ("add", "change", "delete"))
    if "content.view" in capabilities:
        permissions.add("programs.view_roadmapentry")
    if "content.manage" in capabilities:
        permissions.update(f"programs.{action}_roadmapentry" for action in ("add", "change", "delete"))
    if "support.view" in capabilities:
        permissions.update({"support.view_ticket", "support.view_ticketmessage"})
    return permissions
