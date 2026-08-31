from django.urls import path

from apps.content.presentation.views.public import NewsListView

urlpatterns = [
    path("news/", NewsListView.as_view(), name="shared-news"),
]
