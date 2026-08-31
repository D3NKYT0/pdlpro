from django.contrib import admin

from apps.social.infrastructure.models import Comment, Post, PostLike


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ("author", "body", "likes_count", "comments_count", "created_at")
    search_fields = ("body", "author__username")


@admin.register(PostLike)
class PostLikeAdmin(admin.ModelAdmin):
    list_display = ("post", "user", "created_at")


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ("post", "author", "body", "created_at")
