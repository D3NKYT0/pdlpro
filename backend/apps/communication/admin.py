from django.contrib import admin

from apps.communication.infrastructure.models import Chat, ChatMessage, Friendship, Notification, PushSubscription


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("title", "user", "kind", "is_read", "created_at")
    list_filter = ("kind", "is_read")
    search_fields = ("title", "user__username")


@admin.register(Friendship)
class FriendshipAdmin(admin.ModelAdmin):
    list_display = ("user", "friend", "accepted", "created_at")
    list_filter = ("accepted",)


@admin.register(Chat)
class ChatAdmin(admin.ModelAdmin):
    list_display = ("user1", "user2", "last_message", "updated_at")


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ("chat", "sender", "text", "is_read", "created_at")


@admin.register(PushSubscription)
class PushSubscriptionAdmin(admin.ModelAdmin):
    list_display = ("user", "endpoint", "created_at")
    search_fields = ("user__username", "endpoint")
