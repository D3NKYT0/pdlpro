from drf_spectacular.utils import extend_schema
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from common.version import API_VERSION


class HealthView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(tags=["Sistema"])
    def get(self, request):
        return Response({"status": "ok"})


class VersionView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(tags=["Sistema"])
    def get(self, request):
        return Response({"product": "PDL PRO", "api_version": API_VERSION})
