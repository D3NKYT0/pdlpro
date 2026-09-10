import json

from django.conf import settings
from django.test import RequestFactory, SimpleTestCase
from django.utils import translation
from django.utils.translation import gettext as _

from apps.accounts.infrastructure.models import User
from common.architecture.exceptions import EntityNotFoundError
from common.exceptions import custom_exception_handler
from common.i18n import (
    activate_language,
    from_django_language,
    parse_accept_language,
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

    def test_parse_accept_language_picks_first_supported(self):
        self.assertEqual(parse_accept_language("en-US,en;q=0.9,pt-BR;q=0.8"), "en")
        self.assertEqual(parse_accept_language("pt-BR"), "pt")
        self.assertEqual(parse_accept_language("fr-FR,fr;q=0.9"), None)
        self.assertIsNone(parse_accept_language(""))
        self.assertIsNone(parse_accept_language(None))

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

    def test_x_language_beats_django_language_cookie(self):
        factory = RequestFactory()
        request = factory.get(
            "/api/v1/public/news/",
            HTTP_X_LANGUAGE="en",
            HTTP_ACCEPT_LANGUAGE="es",
        )
        request.COOKIES["django_language"] = "pt-br"

        def view(_request):
            from django.http import HttpResponse

            return HttpResponse(_("O recurso solicitado não foi encontrado."))

        from django.middleware.locale import LocaleMiddleware

        response = LocaleMiddleware(ApiLanguageMiddleware(view))(request)
        self.assertEqual(request.pdl_language, "en")
        self.assertEqual(response.content.decode(), "The requested resource was not found.")

    def test_api_accept_language_beats_django_language_cookie(self):
        factory = RequestFactory()
        request = factory.get(
            "/api/v1/public/news/",
            HTTP_ACCEPT_LANGUAGE="en",
        )
        request.COOKIES["django_language"] = "pt-br"

        def view(_request):
            from django.http import HttpResponse

            return HttpResponse(_("O recurso solicitado não foi encontrado."))

        from django.middleware.locale import LocaleMiddleware

        response = LocaleMiddleware(ApiLanguageMiddleware(view))(request)
        self.assertEqual(request.pdl_language, "en")
        self.assertEqual(response.content.decode(), "The requested resource was not found.")

    def test_non_api_keeps_cookie_over_accept_language(self):
        factory = RequestFactory()
        request = factory.get(
            "/admin/",
            HTTP_ACCEPT_LANGUAGE="en",
        )
        request.COOKIES["django_language"] = "pt-br"

        def view(_request):
            from django.http import HttpResponse
            from django.utils import translation

            return HttpResponse(translation.get_language())

        from django.middleware.locale import LocaleMiddleware

        response = LocaleMiddleware(ApiLanguageMiddleware(view))(request)
        self.assertEqual(request.pdl_language, "pt")
        self.assertEqual(response.content.decode(), "pt-br")

    def test_api_docs_keep_cookie_over_accept_language(self):
        """Swagger/ReDoc usam setlang; o Accept-Language do browser não pode anular."""
        factory = RequestFactory()
        request = factory.get(
            "/api/docs/swagger-ui/",
            HTTP_ACCEPT_LANGUAGE="pt-BR,pt;q=0.9",
        )
        request.COOKIES["django_language"] = "en"

        def view(_request):
            from django.http import HttpResponse
            from django.utils import translation

            return HttpResponse(translation.get_language())

        from django.middleware.locale import LocaleMiddleware

        response = LocaleMiddleware(ApiLanguageMiddleware(view))(request)
        self.assertEqual(request.pdl_language, "en")
        self.assertEqual(response.content.decode(), "en")

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


class CatalogResolutionTests(SimpleTestCase):
    def test_model_verbose_name_and_jazzmin_welcome_resolve_in_english(self):
        activate_language("en")
        try:
            self.assertEqual(str(User._meta.verbose_name), "User")
            self.assertEqual(
                str(settings.JAZZMIN_SETTINGS["welcome_sign"]),
                "Administrative panel access",
            )
        finally:
            translation.deactivate()

    def test_api_validation_message_translates_in_handler(self):
        from rest_framework.exceptions import ValidationError

        activate_language("en")
        try:
            response = custom_exception_handler(
                ValidationError("Resolva o CAPTCHA para continuar."),
                {"request": None},
            )
        finally:
            translation.deactivate()
        self.assertIsNotNone(response)
        assert response is not None
        self.assertIn("CAPTCHA", response.data["message"])
        self.assertNotIn("Resolva", response.data["message"])

    def test_openapi_documentation_strings_are_translated(self):
        """Summaries and tag blurbs wrapped in gettext must resolve per language."""
        activate_language("en")
        try:
            self.assertEqual(_("Obter token CSRF"), "Get CSRF token")
            self.assertEqual(_("Excluir passkey"), "Delete passkey")
            self.assertEqual(_("Webhook Mercado Pago"), "Mercado Pago webhook")
            self.assertEqual(
                _("Health check e versão da API."),
                "Health check and API version.",
            )
        finally:
            translation.deactivate()

        activate_language("es")
        try:
            self.assertEqual(_("Obter token CSRF"), "Obtener token CSRF")
            self.assertEqual(_("Excluir passkey"), "Eliminar passkey")
        finally:
            translation.deactivate()

    def test_openapi_translation_data_file_matches_catalogs(self):
        """scripts/openapi_translations.json is the source of truth for both catalogs."""
        data = json.loads(
            (settings.BASE_DIR / "scripts" / "openapi_translations.json").read_text(
                encoding="utf-8"
            )
        )
        self.assertGreaterEqual(len(data), 339)

        for language, index in (("en", 0), ("es", 1)):
            activate_language(language)
            try:
                drifted = [
                    msgid
                    for msgid, pair in data.items()
                    if _(msgid) != pair[index]
                ]
            finally:
                translation.deactivate()
            self.assertEqual(drifted, [], f"{language}: {len(drifted)} msgid(s) drifted")

    def test_fuzzy_lookalikes_do_not_steal_api_msgstr(self):
        """msgmerge fuzzy leftovers used to map similar msgids to the wrong EN string."""
        activate_language("en")
        try:
            self.assertEqual(_("Refresh token ausente."), "Refresh token missing.")
            self.assertEqual(_("ID de item inválido."), "Invalid item ID.")
            self.assertEqual(_("Ação 2FA inválida."), "Invalid 2FA action.")
            self.assertEqual(_("Autenticação necessária."), "Authentication required.")
            self.assertEqual(_("Assinatura inválida."), "Invalid signature.")
            self.assertEqual(_("recurso não encontrado"), "resource not found")
            self.assertEqual(_("Carteira não encontrada."), "Wallet not found.")
            self.assertEqual(
                _("Informe um código válido do autenticador."),
                "Enter a valid authenticator code.",
            )
        finally:
            translation.deactivate()
