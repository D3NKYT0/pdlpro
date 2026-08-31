from django.db import models

from common.models import BaseModel


class Post(BaseModel):
    author = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="posts")
    body = models.TextField(max_length=2000)
    is_published = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Post"
        verbose_name_plural = "Posts"

