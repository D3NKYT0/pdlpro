export function canAccessStaff(user: { is_staff?: boolean; is_superuser?: boolean; is_staff_member?: boolean; role?: string } | null) {
  if (!user) return false
  if (user.is_staff || user.is_superuser || user.is_staff_member) return true
  return user.role === 'staff' || user.role === 'admin' || user.role === 'moderator'
}
