from django import forms
from django.contrib import admin

from common.forms import PDLAdminFormMixin, PDLAdminModelForm


def scope_admin_queryset(rows, user, label):
    """Restringe dados pessoais pelo app dono e oculta notas internas de jogadores."""
    from apps.accounts.domain.access import EDITORIAL_ADMIN_MODELS, OWNED_ADMIN_MODELS

    area = {"wallet": "financial_reports", "payment": "financial_reports", "shop": "operational_reports",
            "programs": "programs", "support": "support", "server": "accounts"}.get(label.split(".")[0])
    if user.is_superuser or (area and user.has_perm(f"accounts.{area}_view")):
        return rows
    if label in EDITORIAL_ADMIN_MODELS:
        return rows
    owner = OWNED_ADMIN_MODELS.get(label)
    if not owner:
        return rows.none()
    rows = rows.filter(**{owner: user})
    if label == "support.ticketmessage":
        rows = rows.filter(is_internal=False)
    return rows


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

    def _allows_direct_write(self, request):
        """Somente conteúdo editorial admite escrita ORM delegada no admin.

        Operações de contas, economia, jogo e atendimento passam pelos casos de
        uso da SPA. Grants CRUD acidentais não contornam esses invariantes.
        """
        from apps.accounts.domain.access import EDITORIAL_ADMIN_MODELS
        return request.user.is_superuser or self.model._meta.label_lower in EDITORIAL_ADMIN_MODELS

    def has_add_permission(self, request):
        return self._allows_direct_write(request) and super().has_add_permission(request)

    def has_change_permission(self, request, obj=None):
        return self._allows_direct_write(request) and super().has_change_permission(request, obj)

    def has_delete_permission(self, request, obj=None):
        return self._allows_direct_write(request) and super().has_delete_permission(request, obj)

    def get_queryset(self, request):
        """Consultas pessoais permanecem no proprietário, inclusive em URLs diretas."""
        return scope_admin_queryset(super().get_queryset(request), request.user, self.model._meta.label_lower)

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

    def has_add_permission(self, request, obj=None):
        return request.user.is_superuser and super().has_add_permission(request, obj)

    def has_change_permission(self, request, obj=None):
        return request.user.is_superuser and super().has_change_permission(request, obj)

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser and super().has_delete_permission(request, obj)

    def get_queryset(self, request):
        return scope_admin_queryset(super().get_queryset(request), request.user, self.model._meta.label_lower)

    def get_formset(self, request, obj=None, **kwargs):
        formset = super().get_formset(request, obj, **kwargs)
        formset.form = with_pdl_form_system(formset.form)
        return formset


class PDLTabularInline(PDLInlineFormMixin, admin.TabularInline):
    """Base de inline tabular com formulários e recursos visuais do PDL.

    Herde desta classe e defina ``model`` para editar relações em tabela dentro do admin,
    preservando as máscaras e os widgets compartilhados.
    """



class PDLStackedInline(PDLInlineFormMixin, admin.StackedInline):
    """Base de inline em blocos com formulários e recursos visuais do PDL.

    Herde desta classe e defina ``model`` quando cada objeto relacionado precisar de mais espaço
    que uma linha tabular no admin.
    """



class PDLForm(PDLAdminFormMixin, forms.Form):
    """Formulário sem modelo com widgets, máscaras e recursos visuais do PDL.

    Herde para formulários administrativos que não persistem diretamente um modelo. Para edição
    ORM, use PDLAdminModelForm.
    """

