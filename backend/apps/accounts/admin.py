from django.contrib import admin

from apps.accounts.infrastructure.models import (
    Achievement,
    GamerProfile,
    RewardClaim,
    RewardDefinition,
    User,
    UserAchievement,
)


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ("username", "email", "role", "is_active", "created_at")
    search_fields = ("username", "email")
    list_filter = ("role", "is_active", "is_email_verified")
    readonly_fields = ("id", "created_at", "updated_at")


@admin.register(GamerProfile)
class GamerProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "level", "xp")


@admin.register(Achievement)
class AchievementAdmin(admin.ModelAdmin):
    list_display = ("code", "name")


@admin.register(UserAchievement)
class UserAchievementAdmin(admin.ModelAdmin):
    list_display = ("user", "achievement", "created_at")


@admin.register(RewardDefinition)
class RewardDefinitionAdmin(admin.ModelAdmin):
    list_display = ("kind", "reference", "item_name", "quantity")


@admin.register(RewardClaim)
class RewardClaimAdmin(admin.ModelAdmin):
    list_display = ("user", "reward", "created_at")
