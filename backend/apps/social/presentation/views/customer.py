from dataclasses import asdict

from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.social.application.engagement import (
    CreateCommentInput,
    CreateCommentUseCase,
    DeleteCommentInput,
    DeleteCommentUseCase,
    ListCommentsInput,
    ListCommentsUseCase,
    TogglePostLikeInput,
    TogglePostLikeUseCase,
)
from apps.social.application.use_cases import CreatePostInput, CreatePostUseCase, ListPublicPostsUseCase
from apps.social.domain.entities import PostEntity
from apps.social.presentation.serializers import CreatePostSerializer
from common.views import InjectedAPIView


def dump_post(post: PostEntity) -> dict:
    payload = asdict(post)
    payload["id"] = str(payload["id"])
    payload["author_id"] = str(payload["author_id"])
    return payload


class CreateCommentSerializer(serializers.Serializer):
    body = serializers.CharField(min_length=1, max_length=500)


class PublicFeedView(InjectedAPIView):
    permission_classes = [AllowAny]

    @extend_schema(tags=["Social"])
    def get(self, request):
        viewer = request.user.id if request.user.is_authenticated else None
        return Response([dump_post(post) for post in self.resolve(ListPublicPostsUseCase).execute(viewer)])


class CreatePostView(InjectedAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Social"], request=CreatePostSerializer)
    def post(self, request):
        serializer = CreatePostSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        post = self.resolve(CreatePostUseCase).execute(
            CreatePostInput(author_id=request.user.id, body=serializer.validated_data["body"])
        )
        return Response(dump_post(post))


class TogglePostLikeView(InjectedAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Social"])
    def post(self, request, post_id):
        return Response(
            self.resolve(TogglePostLikeUseCase).execute(TogglePostLikeInput(user_id=request.user.id, post_id=post_id))
        )


class PostCommentsView(InjectedAPIView):
    permission_classes = [AllowAny]

    @extend_schema(tags=["Social"])
    def get(self, request, post_id):
        return Response(self.resolve(ListCommentsUseCase).execute(ListCommentsInput(post_id=post_id)))

    @extend_schema(tags=["Social"], request=CreateCommentSerializer)
    def post(self, request, post_id):
        if not request.user.is_authenticated:
            from rest_framework.exceptions import NotAuthenticated

            raise NotAuthenticated()
        serializer = CreateCommentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(
            self.resolve(CreateCommentUseCase).execute(
                CreateCommentInput(user_id=request.user.id, post_id=post_id, body=serializer.validated_data["body"])
            )
        )


class DeleteCommentView(InjectedAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Social"])
    def delete(self, request, comment_id):
        return Response(
            self.resolve(DeleteCommentUseCase).execute(
                DeleteCommentInput(user_id=request.user.id, comment_id=comment_id)
            )
        )
