from django.urls import path

from apps.social.presentation.views.customer import CreatePostView

urlpatterns = [
    path("posts/", CreatePostView.as_view(), name="customer-social-posts"),
]
