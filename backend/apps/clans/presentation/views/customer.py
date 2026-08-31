from dataclasses import asdict

from drf_spectacular.utils import extend_schema
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.clans.application.use_cases import (
    ApplyToClanInput,
    ApplyToClanUseCase,
    CreateClanInput,
    CreateClanUseCase,
    ListClanApplicationsInput,
    ListClanApplicationsUseCase,
    ListMyApplicationsInput,
    ListMyApplicationsUseCase,
    ListPublicClansUseCase,
    ReviewApplicationInput,
    ReviewApplicationUseCase,
)
from apps.clans.domain.entities import ClanApplicationEntity, ClanEntity
from apps.clans.presentation.serializers import ApplyToClanSerializer, CreateClanSerializer, ReviewApplicationSerializer
from common.views import InjectedAPIView


def dump_clan(clan: ClanEntity) -> dict:
    payload = asdict(clan)
    payload["id"] = str(payload["id"])
    payload["owner_id"] = str(payload["owner_id"])
    return payload


def dump_application(row: ClanApplicationEntity) -> dict:
    payload = asdict(row)
    payload["id"] = str(payload["id"])
    payload["clan_id"] = str(payload["clan_id"])
    payload["user_id"] = str(payload["user_id"])
    return payload


class PublicClanListView(InjectedAPIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(tags=["Clãs"])
    def get(self, request):
        return Response([dump_clan(clan) for clan in self.resolve(ListPublicClansUseCase).execute()])


class MyClansView(InjectedAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Clãs"], request=CreateClanSerializer)
    def post(self, request):
        serializer = CreateClanSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        clan = self.resolve(CreateClanUseCase).execute(
            CreateClanInput(owner_id=request.user.id, **serializer.validated_data)
        )
        return Response(dump_clan(clan))


class MyClanApplicationsView(InjectedAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Clãs"])
    def get(self, request):
        rows = self.resolve(ListMyApplicationsUseCase).execute(ListMyApplicationsInput(user_id=request.user.id))
        return Response([dump_application(row) for row in rows])


class ApplyToClanView(InjectedAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Clãs"], request=ApplyToClanSerializer)
    def post(self, request, clan_id):
        serializer = ApplyToClanSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        row = self.resolve(ApplyToClanUseCase).execute(
            ApplyToClanInput(user_id=request.user.id, clan_id=clan_id, **serializer.validated_data)
        )
        return Response(dump_application(row))


class ClanApplicationsView(InjectedAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Clãs"])
    def get(self, request, clan_id):
        rows = self.resolve(ListClanApplicationsUseCase).execute(
            ListClanApplicationsInput(user_id=request.user.id, clan_id=clan_id)
        )
        return Response([dump_application(row) for row in rows])


class ReviewClanApplicationView(InjectedAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Clãs"], request=ReviewApplicationSerializer)
    def post(self, request, application_id):
        serializer = ReviewApplicationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        row = self.resolve(ReviewApplicationUseCase).execute(
            ReviewApplicationInput(
                user_id=request.user.id,
                application_id=application_id,
                status=serializer.validated_data["status"],
            )
        )
        return Response(dump_application(row))
