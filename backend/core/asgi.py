import os

import django
from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import OriginValidator
from django.conf import settings
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings.production")
django.setup()

from core.websocket_routing import websocket_urlpatterns  # noqa: E402

application = ProtocolTypeRouter(
    {
        "http": get_asgi_application(),
        "websocket": OriginValidator(
            AuthMiddlewareStack(URLRouter(websocket_urlpatterns)),
            settings.WEBSOCKET_ALLOWED_ORIGINS,
        ),
    }
)
