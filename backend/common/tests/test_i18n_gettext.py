from django.test import RequestFactory, SimpleTestCase, override_settings
from django.utils import translation
from django.utils.translation import gettext as _

from common.architecture.exceptions import EntityNotFoundError
from common.exceptions import custom_exception_handler
from common.i18n import (
    activate_language,
    from_django_language,
    resolve_language,
    to_django_language,
)
from common.middleware import ApiLanguageMiddleware


class ProductLanguageHelpersTests(SimpleTestCase):
    def test_resolve_language_normalizes_and_falls_back(self):
        self.assertEqual(resolve_language("EN"), "en")
        self.assertEqual(resolve_language("pt-BR"), "pt")
        self.assertEqual(resolve_language("es-ES"), "es")
        self.assertEqual(resolve_language("fr"), "pt")

    def test_django_locale_roundtrip(self):
        self.assertEqual(to_django_language("pt"), "pt-br")
        self.assertEqual(to_django_language("en"), "en")
        self.assertEqual(from_django_language("pt-br"), "pt")
        self.assertEqual(from_django_language("en"), "en")


class ApiLanguageMiddlewareTests(SimpleTestCase):
    def test_query_lang_activates_django_gettext(self):
        factory = RequestFactory()
        request = factory.get("/api/v1/public/news/", {"lang": "en"})

        def view(_request):
            from django.http import HttpResponse

            return HttpResponse(_("O recurso solicitado não foi encontrado."))

        middleware = ApiLanguageMiddleware(view)
        response = middleware(request)
        self.assertEqual(request.pdl_language, "en")
        self.assertEqual(request.LANGUAGE_CODE, "en")
        self.assertEqual(response.content.decode(), "The requested resource was not found.")
        self.assertEqual(response["Content-Language"], "en")

    def test_domain_error_message_is_translated_in_handler(self):
        activate_language("es")
        try:
            response = custom_exception_handler(EntityNotFoundError(), {"request": None})
        finally:
            translation.deactivate()
        self.assertIsNotNone(response)
        assert response is not None
        self.assertEqual(response.status_code, 404)
        self.assertEqual(
            response.data["message"],
            "No se encontró el recurso solicitado.",
        )
