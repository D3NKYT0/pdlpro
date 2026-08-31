from django.urls import path

from apps.content.presentation.views.public import DownloadListView, FaqListView, NewsDetailView, NewsListView

urlpatterns = [
    path("news/", NewsListView.as_view(), name="public-news"),
    path("news/<slug:slug>/", NewsDetailView.as_view(), name="public-news-detail"),
    path("faq/", FaqListView.as_view(), name="public-faq"),
    path("downloads/", DownloadListView.as_view(), name="public-downloads"),
]
