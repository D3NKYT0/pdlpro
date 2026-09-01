from django.contrib import admin

from core.settings.jazzmin_icons import JAZZMIN_ICONS_PDL


def test_every_registered_admin_model_has_a_jazzmin_icon():
    registered_models = {
        f"{model._meta.app_label}.{model._meta.model_name}"
        for model in admin.site._registry
    }

    missing_icons = registered_models - JAZZMIN_ICONS_PDL.keys()

    assert not missing_icons, f"Jazzmin icons missing for: {sorted(missing_icons)}"
