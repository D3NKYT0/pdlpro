from django.db import models
from django.utils import timezone
from django.utils.text import slugify

from common.models import BaseModel


class News(BaseModel):
    slug = models.SlugField(max_length=200, unique=True, blank=True)
    title = models.CharField(max_length=200)
    excerpt = models.CharField(max_length=300, blank=True)
    body = models.TextField()
    image = models.ImageField(upload_to="news/", null=True, blank=True)
    author = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True)
    published_at = models.DateTimeField(default=timezone.now)
    is_published = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Notícia"
        verbose_name_plural = "Notícias"
        ordering = ["-published_at"]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)[:200]
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.title


class Faq(BaseModel):
    question = models.CharField(max_length=250)
    answer = models.TextField()
    order = models.PositiveIntegerField(default=0)
    is_published = models.BooleanField(default=True)

    class Meta:
        verbose_name = "FAQ"
        verbose_name_plural = "FAQ"
        ordering = ["order", "question"]

    def __str__(self) -> str:
        return self.question


class DownloadLink(BaseModel):
    title = models.CharField(max_length=120)
    url = models.URLField()
    category = models.CharField(max_length=60, default="client")
    is_published = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = "Download"
        verbose_name_plural = "Downloads"
        ordering = ["order"]

    def __str__(self) -> str:
        return self.title


class WikiPage(BaseModel):
    slug = models.SlugField(max_length=200, unique=True, blank=True)
    title = models.CharField(max_length=200)
    summary = models.CharField(max_length=400, blank=True)
    body = models.TextField()
    category = models.CharField(max_length=40, default="guide")
    icon = models.CharField(max_length=50, blank=True)
    order = models.IntegerField(default=0)
    is_published = models.BooleanField(default=True)
    is_menu_item = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Página do wiki"
        verbose_name_plural = "Wiki"
        ordering = ["order", "title"]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)[:200]
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.title


class CalendarEvent(BaseModel):
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    color = models.CharField(max_length=20, default="gold")
    is_published = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Evento"
        verbose_name_plural = "Calendário"
        ordering = ["starts_at"]

    def __str__(self) -> str:
        return self.title
