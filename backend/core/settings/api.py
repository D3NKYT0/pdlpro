from common.swagger import OPENAPI_DESCRIPTION, OPENAPI_TITLE, pdl_swagger_tags


def get_rest_framework_settings():
    return {
        "DEFAULT_AUTHENTICATION_CLASSES": [
            "apps.accounts.infrastructure.authentication.CookieJWTAuthentication",
        ],
        "DEFAULT_PERMISSION_CLASSES": [
            "rest_framework.permissions.IsAuthenticated",
        ],
        "DEFAULT_RENDERER_CLASSES": [
            "rest_framework.renderers.JSONRenderer",
        ],
        "DEFAULT_PAGINATION_CLASS": "common.pagination.StandardPagination",
        "PAGE_SIZE": 20,
        "DEFAULT_FILTER_BACKENDS": [
            "django_filters.rest_framework.DjangoFilterBackend",
            "rest_framework.filters.SearchFilter",
            "rest_framework.filters.OrderingFilter",
        ],
        "DEFAULT_THROTTLE_CLASSES": [
            "rest_framework.throttling.AnonRateThrottle",
            "rest_framework.throttling.UserRateThrottle",
        ],
        "DEFAULT_THROTTLE_RATES": {
            "anon": "1000/hour",
            "user": "10000/hour",
            "login": "10/minute",
            "register": "10/hour",
        },
        "EXCEPTION_HANDLER": "common.exceptions.custom_exception_handler",
        "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    }


def get_spectacular_settings(api_version):
    return {
        "TITLE": OPENAPI_TITLE,
        "DESCRIPTION": OPENAPI_DESCRIPTION,
        "VERSION": api_version,
        "SERVE_INCLUDE_SCHEMA": False,
        "SWAGGER_UI_DIST": "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.32.0",
        "SWAGGER_UI_SETTINGS": {
            "docExpansion": "list",
            "defaultModelsExpandDepth": 1,
            "displayRequestDuration": True,
            "filter": True,
            "persistAuthorization": True,
            "operationsSorter": "alpha",
        },
        "COMPONENT_SPLIT_REQUEST": True,
        "TAGS": pdl_swagger_tags,
    }
