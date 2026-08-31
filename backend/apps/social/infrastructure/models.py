from django.conf import settings
from django.db import models

from common.models import BaseModel


class Post(BaseModel):
    author = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="posts")
    body = models.TextField(max_length=2000)
    is_published = models.BooleanField(default=True)
    likes_count = models.PositiveIntegerField(default=0)
    comments_count = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = "Post"
        verbose_name_plural = "Posts"


class PostLike(BaseModel):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="likes")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="post_likes")

    class Meta:
        verbose_name = "Curtida"
        unique_together = ("post", "user")


class Comment(BaseModel):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="comments")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="comments")
    body = models.TextField(max_length=500)

    class Meta:
        verbose_name = "Comentário"
        ordering = ["created_at"]
