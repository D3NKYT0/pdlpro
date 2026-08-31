from django.urls import path

from apps.content.presentation.views.public import (
    CalendarEventListView,
    DownloadListView,
    FaqListView,
    LegalDetailView,
    LegalListView,
    NewsDetailView,
    NewsListView,
    WikiDetailView,
    WikiListView,
)

urlpatterns = [
    path("news/", NewsListView.as_view(), name="public-news"),
    path("news/<slug:slug>/", NewsDetailView.as_view(), name="public-news-detail"),
    path("faq/", FaqListView.as_view(), name="public-faq"),
    path("downloads/", DownloadListView.as_view(), name="public-downloads"),
    path("wiki/", WikiListView.as_view(), name="public-wiki"),
    path("wiki/<slug:slug>/", WikiDetailView.as_view(), name="public-wiki-detail"),
    path("calendar/", CalendarEventListView.as_view(), name="public-calendar"),
    path("legal/", LegalListView.as_view(), name="public-legal"),
    path("legal/<slug:slug>/", LegalDetailView.as_view(), name="public-legal-detail"),
]
