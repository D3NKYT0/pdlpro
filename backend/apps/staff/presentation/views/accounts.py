from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.server.application.account_use_cases import ForceUnlinkGameAccountUseCase, InspectGameAccountUseCase
from common.permissions import IsStaffMember
from common.views import InjectedAPIView


class StaffInspectGameAccountView(InjectedAPIView):
    permission_classes = [IsAuthenticated, IsStaffMember]

    @extend_schema(tags=["Staff"])
    def get(self, request):
        return Response(self.resolve(InspectGameAccountUseCase).execute(request.query_params.get("login") or ""))


class StaffUnlinkGameAccountView(InjectedAPIView):
    permission_classes = [IsAuthenticated, IsStaffMember]

    @extend_schema(tags=["Staff"])
    def post(self, request):
        return Response(self.resolve(ForceUnlinkGameAccountUseCase).execute(request.data.get("login") or ""))
