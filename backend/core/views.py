from django.http import JsonResponse
from django.views.decorators.http import require_GET
from django.contrib import admin
from django.template.response import TemplateResponse

from common.version import API_VERSION


@require_GET
def admin_components(request):
    """Catálogo sem escrita, protegido por admin.site.admin_view na configuração de URLs."""
    return TemplateResponse(request, "admin/pdl_components.html", {
        **admin.site.each_context(request),
        "title": "Componentes de interface",
    })


@require_GET
def backend_index(request):
    return JsonResponse(
        {
            "product": "PDL PRO",
            "api": "/api/v1/",
            "docs": "/api/docs/swagger-ui/",
            "version": API_VERSION,
        }
    )


def custom_400(request, exception=None):
    return JsonResponse({"error_code": "VALIDATION_ERROR", "message": "Requisição inválida."}, status=400)


def custom_403(request, exception=None):
    return JsonResponse({"error_code": "PERMISSION_DENIED", "message": "Acesso negado."}, status=403)


def custom_404(request, exception=None):
    return JsonResponse({"error_code": "RESOURCE_NOT_FOUND", "message": "Não encontrado."}, status=404)


def custom_500(request):
    return JsonResponse({"error_code": "INTERNAL_SERVER_ERROR", "message": "Erro interno."}, status=500)
