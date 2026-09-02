from rest_framework.permissions import BasePermission


class IsStaffMember(BasePermission):
    """Permite acesso a usuários autenticados com is_staff ou is_staff_member.

    Declare em ``permission_classes`` nos endpoints administrativos. Verifica o acesso à view;
    não implementa autorização por objeto ou por proprietário.
    """

    def has_permission(self, request, view) -> bool:
        user = getattr(request, "user", None)
        return bool(
            user
            and user.is_authenticated
            and (user.is_staff or getattr(user, "is_staff_member", False))
        )


class IsSuperAdmin(BasePermission):
    """Permite acesso somente a usuários autenticados com is_superuser.

    Declare em ``permission_classes`` para operações exclusivas do superadministrador; o papel
    comum de staff não satisfaz esta permissão.
    """

    def has_permission(self, request, view) -> bool:
        user = getattr(request, "user", None)
        return bool(user and user.is_authenticated and user.is_superuser)
