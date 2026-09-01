from django import forms
from django.contrib import admin

from common.forms import PDLAdminFormMixin, PDLAdminModelForm


def with_pdl_form_system(form_class):
    """Wrap custom admin forms without forcing callers to repeat the mixin."""
    if issubclass(form_class, PDLAdminFormMixin):
        return form_class
    return type(
        f"PDL{form_class.__name__}",
        (PDLAdminFormMixin, form_class),
        {"__module__": form_class.__module__},
    )


class PDLModelAdmin(admin.ModelAdmin):
    """ModelAdmin that injects the PDL form system into generated/custom forms."""

    form = PDLAdminModelForm

    def get_form(self, request, obj=None, change=False, **kwargs):
        form_class = super().get_form(request, obj, change=change, **kwargs)
        return with_pdl_form_system(form_class)

    def get_changelist_form(self, request, **kwargs):
        form_class = super().get_changelist_form(request, **kwargs)
        return with_pdl_form_system(form_class)


class PDLInlineFormMixin:
    form = PDLAdminModelForm

    def get_formset(self, request, obj=None, **kwargs):
        formset = super().get_formset(request, obj, **kwargs)
        formset.form = with_pdl_form_system(formset.form)
        return formset


class PDLTabularInline(PDLInlineFormMixin, admin.TabularInline):
    pass


class PDLStackedInline(PDLInlineFormMixin, admin.StackedInline):
    pass


class PDLForm(PDLAdminFormMixin, forms.Form):
    """Reusable non-model form with PDL assets and widget enhancement."""

    pass
