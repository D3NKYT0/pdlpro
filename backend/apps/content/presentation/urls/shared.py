from django.urls import path

from apps.content.presentation.views.public import NewsListView
from apps.content.presentation.views.shared import (
    AssistantReplyView,
    AuthenticatedFaqListView,
    DenkynhoProfileView,
)

urlpatterns = [
    path("news/", NewsListView.as_view(), name="shared-news"),
    path("faq/", AuthenticatedFaqListView.as_view(), name="shared-faq"),
    path("assistant/reply/", AssistantReplyView.as_view(), name="assistant-reply"),
    path("assistant/pet/", DenkynhoProfileView.as_view(), name="assistant-pet"),
]
