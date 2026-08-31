from django.contrib import admin

from apps.games.infrastructure.models import GameConfig


@admin.register(GameConfig)
class GameConfigAdmin(admin.ModelAdmin):
    list_display = ("id", "created_at")
