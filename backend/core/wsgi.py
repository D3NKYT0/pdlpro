"""WSGI config for PDL PRO."""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings.production")

application = get_wsgi_application()
