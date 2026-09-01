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
        "SWAGGER_UI_FAVICON_HREF": "/static/pdl_admin/img/favicon-32x32.png",
        "SWAGGER_UI_SETTINGS": {
            "docExpansion": "list",
            "defaultModelsExpandDepth": 1,
            "displayRequestDuration": True,
            "deepLinking": True,
            "filter": True,
            "persistAuthorization": True,
            "tryItOutEnabled": True,
            "withCredentials": True,
            "operationsSorter": "alpha",
            "syntaxHighlight": {
                "activate": True,
                "theme": "obsidian",
            },
        },
        "REDOC_UI_SETTINGS": {
            "hideDownloadButton": False,
            "expandDefaultSchemaDescriptions": True,
            "theme": {
                "colors": {
                    "primary": {"main": "#d4af37"},
                    "success": {"main": "#6fbf73"},
                    "error": {"main": "#d45c4a"},
                    "text": {
                        "primary": "#f4ead4",
                        "secondary": "#b5a78c",
                    },
                    "http": {
                        "get": "#6fbf73",
                        "post": "#d4af37",
                        "put": "#c5a161",
                        "patch": "#efcc7b",
                        "delete": "#d45c4a",
                        "options": "#b5a78c",
                        "head": "#8ab4d4",
                    },
                },
                "sidebar": {
                    "backgroundColor": "#14110d",
                    "textColor": "#f4ead4",
                    "activeTextColor": "#efcc7b",
                    "width": "278px",
                },
                "rightPanel": {
                    "backgroundColor": "#080705",
                    "textColor": "#f4ead4",
                },
                "typography": {
                    "fontSize": "15px",
                    "fontFamily": '"Source Sans Pro", system-ui, sans-serif',
                    "headings": {
                        "fontFamily": '"PDL Cambria", Cambria, Georgia, serif',
                        "fontWeight": "700",
                    },
                    "code": {
                        "backgroundColor": "#1b1812",
                        "color": "#efcc7b",
                    },
                    "links": {
                        "color": "#c5a161",
                        "visited": "#d4af37",
                        "hover": "#efcc7b",
                    },
                },
                "schema": {
                    "nestedBackground": "#14110d",
                    "typeNameColor": "#efcc7b",
                    "typeTitleColor": "#f4ead4",
                },
            },
        },
        "COMPONENT_SPLIT_REQUEST": True,
        "TAGS": pdl_swagger_tags,
    }
