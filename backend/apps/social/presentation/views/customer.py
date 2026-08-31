from dataclasses import asdict

from drf_spectacular.utils import extend_schema
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.social.application.use_cases import CreatePostInput, CreatePostUseCase, ListPublicPostsUseCase
from apps.social.domain.entities import PostEntity
from apps.social.presentation.serializers import CreatePostSerializer
from common.views import InjectedAPIView


def dump_post(post: PostEntity) -> dict:
    payload = asdict(post)
    payload["id"] = str(payload["id"])
    payload["author_id"] = str(payload["author_id"])
    return payload


class PublicFeedView(InjectedAPIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(tags=["Social"])
    def get(self, request):
        return Response([dump_post(post) for post in self.resolve(ListPublicPostsUseCase).execute()])


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
