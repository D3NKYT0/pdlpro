from django.urls import path

from apps.social.presentation.views.customer import CreatePostView, DeleteCommentView, PostCommentsView, TogglePostLikeView

urlpatterns = [
    path("posts/", CreatePostView.as_view(), name="customer-social-posts"),
    path("posts/<uuid:post_id>/like/", TogglePostLikeView.as_view(), name="customer-social-like"),
    path("posts/<uuid:post_id>/comments/", PostCommentsView.as_view(), name="customer-social-comments"),
    path("comments/<uuid:comment_id>/", DeleteCommentView.as_view(), name="customer-social-delete-comment"),
]
