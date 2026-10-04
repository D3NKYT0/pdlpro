from rest_framework.permissions import BasePermission


class IsStaffMember(BasePermission):
    """Permite acesso a contas com capacidades administrativas efetivas.

    Declare em ``permission_classes`` nos endpoints administrativos. Verifica o acesso à view;
    não implementa autorização por objeto ou por proprietário.
    """

    def has_permission(self, request, view) -> bool:
        user = getattr(request, "user", None)
        return bool(
            user
            and user.is_authenticated
            and user.is_active
            and getattr(user, "is_staff_member", False)
        )


class HasCapability(BasePermission):
    """Exige a capacidade declarada por método HTTP; ausência nega o acesso.

    ``required_capabilities`` mapeia GET/POST/etc. para um nome do catálogo.
    HEAD usa GET; OPTIONS exige ao menos uma operação autorizada nessa view.
    Não concede acesso a registros de terceiros nem substitui políticas de objeto.
    """

    def has_permission(self, request, view) -> bool:
        from apps.accounts.domain.access import capability_permission

        user = getattr(request, "user", None)
        if not user or not user.is_authenticated or not user.is_active:
            return False
        required = getattr(view, "required_capabilities", {})
        if request.method == "OPTIONS":
            return any(user.has_perm(capability_permission(value)) for value in required.values())
        method = "GET" if request.method == "HEAD" else request.method
        capability = required.get(method)
        if not capability and not hasattr(view, request.method.lower()):
            # Uma operação inexistente mantém HTTP 405 para quem pode acessar a view.
            # Handlers existentes sem declaração continuam negados.
            return any(user.has_perm(capability_permission(value)) for value in required.values())
        return bool(capability and user.has_perm(capability_permission(capability)))


class IsSuperAdmin(BasePermission):
    """Permite acesso somente a usuários autenticados com is_superuser.

    Declare em ``permission_classes`` para operações exclusivas do superadministrador; o papel
    comum de staff não satisfaz esta permissão.
    """

    def has_permission(self, request, view) -> bool:
        user = getattr(request, "user", None)
        return bool(user and user.is_authenticated and user.is_active and user.is_superuser)
