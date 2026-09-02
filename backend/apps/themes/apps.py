from django.apps import AppConfig


class ThemesConfig(AppConfig):
    """Configura o catálogo de temas instaláveis do PDL 2.0."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.themes"
    label = "themes"
    verbose_name = "Temas"

