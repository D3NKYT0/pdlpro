from django.urls import path

from apps.content.presentation.views.public import NewsListView
from apps.content.presentation.views.shared import AuthenticatedFaqListView

urlpatterns = [
    path("news/", NewsListView.as_view(), name="shared-news"),
    path("faq/", AuthenticatedFaqListView.as_view(), name="shared-faq"),
]
