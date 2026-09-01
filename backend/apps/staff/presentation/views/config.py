from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.staff.application.use_cases import (
    GetPanelSettingsUseCase,
    GetStaffCoinConfigUseCase,
    ListStaffGamesUseCase,
    ListStaffNewsUseCase,
    ListStaffServicePricesUseCase,
    ListStaffShopItemsUseCase,
    ToggleStaffGameUseCase,
    UpdatePanelSettingsUseCase,
    UpdateStaffCoinConfigUseCase,
    UpsertStaffNewsUseCase,
    UpsertStaffServicePricesUseCase,
    UpsertStaffShopItemUseCase,
)
from common.permissions import IsStaffMember
from common.views import InjectedAPIView


class StaffPanelSettingsView(InjectedAPIView):
    permission_classes = [IsAuthenticated, IsStaffMember]

    @extend_schema(tags=["Staff"])
    def get(self, request):
        return Response(self.resolve(GetPanelSettingsUseCase).execute())

    @extend_schema(tags=["Staff"])
    def put(self, request):
        return Response(self.resolve(UpdatePanelSettingsUseCase).execute(request.data or {}))


class StaffServicePricesView(InjectedAPIView):
    permission_classes = [IsAuthenticated, IsStaffMember]

    @extend_schema(tags=["Staff"])
    def get(self, request):
        return Response(self.resolve(ListStaffServicePricesUseCase).execute())

    @extend_schema(tags=["Staff"])
    def put(self, request):
        payload = request.data if isinstance(request.data, list) else request.data.get("items", [])
        return Response(self.resolve(UpsertStaffServicePricesUseCase).execute(payload))


class StaffCoinConfigView(InjectedAPIView):
    permission_classes = [IsAuthenticated, IsStaffMember]

    @extend_schema(tags=["Staff"])
    def get(self, request):
        return Response(self.resolve(GetStaffCoinConfigUseCase).execute())

    @extend_schema(tags=["Staff"])
    def put(self, request):
        return Response(self.resolve(UpdateStaffCoinConfigUseCase).execute(request.data or {}))


class StaffShopItemsView(InjectedAPIView):
    permission_classes = [IsAuthenticated, IsStaffMember]

    @extend_schema(tags=["Staff"])
    def get(self, request):
        return Response(self.resolve(ListStaffShopItemsUseCase).execute())

    @extend_schema(tags=["Staff"])
    def post(self, request):
        return Response(self.resolve(UpsertStaffShopItemUseCase).execute(request.data or {}))

    @extend_schema(tags=["Staff"])
    def put(self, request):
        return Response(self.resolve(UpsertStaffShopItemUseCase).execute(request.data or {}))


class StaffNewsView(InjectedAPIView):
    permission_classes = [IsAuthenticated, IsStaffMember]

    @extend_schema(tags=["Staff"])
    def get(self, request):
        return Response(self.resolve(ListStaffNewsUseCase).execute())

    @extend_schema(tags=["Staff"])
    def post(self, request):
        return Response(self.resolve(UpsertStaffNewsUseCase).execute(request.data or {}))

    @extend_schema(tags=["Staff"])
    def put(self, request):
        return Response(self.resolve(UpsertStaffNewsUseCase).execute(request.data or {}))


class StaffGamesView(InjectedAPIView):
    permission_classes = [IsAuthenticated, IsStaffMember]

    @extend_schema(tags=["Staff"])
    def get(self, request):
        return Response(self.resolve(ListStaffGamesUseCase).execute())

    @extend_schema(tags=["Staff"])
    def put(self, request):
        return Response(self.resolve(ToggleStaffGameUseCase).execute(request.data or {}))
