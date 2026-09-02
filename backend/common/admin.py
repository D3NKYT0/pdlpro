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
    """Base de administração que aplica os formulários visuais do PDL.

    Herde em vez de ModelAdmin para receber PDLAdminModelForm e envolver formulários
    personalizados com PDLAdminFormMixin. Também cobre formulários da listagem editável por meio
    de get_changelist_form.
    """

    form = PDLAdminModelForm

    def get_form(self, request, obj=None, change=False, **kwargs):
        form_class = super().get_form(request, obj, change=change, **kwargs)
        return with_pdl_form_system(form_class)

    def get_changelist_form(self, request, **kwargs):
        form_class = super().get_changelist_form(request, **kwargs)
        return with_pdl_form_system(form_class)


class PDLInlineFormMixin:
    """Aplica o sistema visual PDL aos formulários de um inline do admin.

    Use antes de TabularInline ou StackedInline na herança. ``get_formset`` envolve formulários
    personalizados sem duplicar PDLAdminFormMixin.
    """

    form = PDLAdminModelForm

    def get_formset(self, request, obj=None, **kwargs):
        formset = super().get_formset(request, obj, **kwargs)
        formset.form = with_pdl_form_system(formset.form)
        return formset


class PDLTabularInline(PDLInlineFormMixin, admin.TabularInline):
    """Base de inline tabular com formulários e recursos visuais do PDL.

    Herde desta classe e defina ``model`` para editar relações em tabela dentro do admin,
    preservando as máscaras e os widgets compartilhados.
    """

    pass


class PDLStackedInline(PDLInlineFormMixin, admin.StackedInline):
    """Base de inline em blocos com formulários e recursos visuais do PDL.

    Herde desta classe e defina ``model`` quando cada objeto relacionado precisar de mais espaço
    que uma linha tabular no admin.
    """

    pass


class PDLForm(PDLAdminFormMixin, forms.Form):
    """Formulário sem modelo com widgets, máscaras e recursos visuais do PDL.

    Herde para formulários administrativos que não persistem diretamente um modelo. Para edição
    ORM, use PDLAdminModelForm.
    """

    pass
