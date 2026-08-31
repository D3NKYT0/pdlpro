from rest_framework.permissions import BasePermission


class IsStaffMember(BasePermission):
    def has_permission(self, request, view) -> bool:
        user = getattr(request, "user", None)
        return bool(
            user
            and user.is_authenticated
            and (user.is_staff or getattr(user, "is_staff_member", False))
        )


class IsSuperAdmin(BasePermission):
    def has_permission(self, request, view) -> bool:
        user = getattr(request, "user", None)
        return bool(user and user.is_authenticated and user.is_superuser)
