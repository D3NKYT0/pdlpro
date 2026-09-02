import logging

from django import forms
from django.contrib import admin, messages
from django.core.exceptions import PermissionDenied
from django.core.paginator import Paginator
from django.http import HttpResponseNotAllowed
from django.shortcuts import get_object_or_404, redirect
from django.template.response import TemplateResponse
from django.urls import path, reverse

from apps.server.application.item_observation import (
    ObservationUnavailable, capture_snapshot, compare_snapshots, observation_source, read_observation,
)
from apps.server.domain.gateways import ILineageGateway
from apps.server.infrastructure.item_observation_models import (
    ItemObservationCategory, ItemObservationFavorite, ItemObservationSnapshot,
)
from apps.server.infrastructure.lineage.item_catalog import item_display_name
from common.admin import PDLForm, PDLModelAdmin

logger = logging.getLogger(__name__)
PREFIX = "admin:server_itemobservationsnapshot_"


class ItemFilters(PDLForm):
    search = forms.CharField(label="Nome ou ID", required=False, max_length=100)
    minimum = forms.IntegerField(label="Quantidade mínima", required=False, min_value=0)
    category = forms.ChoiceField(label="Categoria", required=False)
    favorites = forms.BooleanField(label="Só favoritos", required=False)
    sort = forms.ChoiceField(label="Ordenar", required=False, choices=[
        ("quantity", "Quantidade"), ("unique_owners", "Donos"), ("instances", "Stacks"), ("name", "Nome"),
    ])

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["category"].choices = [("", "Todas")] + [
            (name, name) for name in ItemObservationCategory.objects.values_list("name", flat=True)
        ]


class SnapshotForm(PDLForm):
    notes = forms.CharField(label="Notas do snapshot", required=False, max_length=2000,
                            widget=forms.Textarea(attrs={"rows": 2}))


class ComparisonForm(PDLForm):
    before = forms.ModelChoiceField(label="Snapshot inicial", queryset=ItemObservationSnapshot.objects.none())
    after = forms.ModelChoiceField(label="Snapshot final", queryset=ItemObservationSnapshot.objects.none())

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field in self.fields.values():
            field.queryset = ItemObservationSnapshot.objects.all()


@admin.register(ItemObservationCategory)
class ItemObservationCategoryAdmin(PDLModelAdmin):
    list_display = ("name", "order", "description")
    search_fields = ("name",)


@admin.register(ItemObservationSnapshot)
class ItemObservationSnapshotAdmin(PDLModelAdmin):
    list_display = ("snapshot_date", "source", "total_quantity", "site_quantity", "created_by", "observation_link")
    list_filter = ("snapshot_date", "source")
    readonly_fields = ("snapshot_date", "source", "created_by", "total_characters", "total_instances",
                       "total_quantity", "site_quantity", "notes", "created_at")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    @admin.display(description="Detalhes")
    def observation_link(self, obj):
        from django.utils.html import format_html
        return format_html('<a href="{}">Observar</a>', reverse(PREFIX + "detail", args=[obj.pk]))

    def get_urls(self):
        wrap = self.admin_site.admin_view
        return [
            path("observe/", wrap(self.monitor), name="server_itemobservationsnapshot_monitor"),
            path("capture/", wrap(self.capture), name="server_itemobservationsnapshot_capture"),
            path("favorite/<int:item_id>/", wrap(self.favorite), name="server_itemobservationsnapshot_favorite"),
            path("compare/", wrap(self.compare), name="server_itemobservationsnapshot_compare"),
            path("<int:pk>/observe/", wrap(self.detail), name="server_itemobservationsnapshot_detail"),
        ] + super().get_urls()

    def require_view(self, request):
        if not self.has_view_permission(request):
            raise PermissionDenied

    def context(self, request, title):
        self.require_view(request)
        request.current_app = self.admin_site.name
        return {**self.admin_site.each_context(request), "opts": self.model._meta, "title": title,
                "media": SnapshotForm().media,
                "monitor_url": reverse(PREFIX + "monitor"), "history_url": reverse(PREFIX + "changelist"),
                "compare_url": reverse(PREFIX + "compare"),
                "category_url": reverse("admin:server_itemobservationcategory_changelist"),
                "can_categories": request.user.has_perm("server.view_itemobservationcategory"),
                "can_capture": request.user.has_perm("server.capture_itemobservationsnapshot")}

    def report_failure(self, request, exc):
        if isinstance(exc, ObservationUnavailable):
            messages.error(request, str(exc))
        else:
            logger.exception("Falha ao observar itens L2")
            messages.error(request, "Não foi possível consultar os itens L2. Confira a conexão e o módulo SQL nos logs.")

    def monitor(self, request):
        context = self.context(request, "Observar itens do servidor")
        if request.method != "GET":
            return HttpResponseNotAllowed(["GET"])
        form = ItemFilters(request.GET)
        context.update(filters=form, capture_form=SnapshotForm(), recent=ItemObservationSnapshot.objects.all()[:10])
        try:
            data = read_observation(request.container.resolve(ILineageGateway))
        except Exception as exc:
            self.report_failure(request, exc)
            data = None
        if data is not None:
            favorites = set(ItemObservationFavorite.objects.filter(user=request.user, source=data["source"])
                            .values_list("item_id", flat=True))
            rows = list(data["items"])
            present = {row["item_id"] for row in rows}
            for item_id in sorted(favorites - present):
                rows.append({"item_id": item_id, "item_name": item_display_name(item_id), "quantity": 0,
                             "instances": 0, "unique_owners": 0, "category_name": ""})
            for row in rows:
                row["is_favorite"] = row["item_id"] in favorites
            if form.is_valid():
                options = form.cleaned_data
                needle = options["search"].casefold()
                rows = [row for row in rows if
                        (not needle or needle in row["item_name"].casefold() or needle in str(row["item_id"]))
                        and row["quantity"] >= (options["minimum"] or 0)
                        and (not options["favorites"] or row["is_favorite"])
                        and (not options["category"] or options["category"] == row["category_name"])]
                sort = options["sort"] or "quantity"
                rows.sort(key=(lambda row: (row["item_name"].casefold(), row["item_id"])) if sort == "name"
                          else lambda row: (-row[sort], row["item_id"]))
            else:
                rows = []
            context.update(data=data, page_obj=Paginator(rows, 50).get_page(request.GET.get("page")))
        return TemplateResponse(request, "admin/server/item_observation/monitor.html", context)

    def capture(self, request):
        self.require_view(request)
        if not request.user.has_perm("server.capture_itemobservationsnapshot"):
            raise PermissionDenied
        if request.method != "POST":
            return HttpResponseNotAllowed(["POST"])
        form = SnapshotForm(request.POST)
        if not form.is_valid():
            messages.error(request, "Notas inválidas: use no máximo 2000 caracteres.")
            return redirect(PREFIX + "monitor")
        try:
            snapshot = capture_snapshot(request.container.resolve(ILineageGateway), request.user, form.cleaned_data["notes"])
            self.log_addition(request, snapshot, "Snapshot L2 capturado em modo somente leitura.")
        except Exception as exc:
            self.report_failure(request, exc)
            return redirect(PREFIX + "monitor")
        messages.success(request, "Snapshot salvo no banco do painel. Nenhum item L2 foi alterado.")
        return redirect(PREFIX + "detail", pk=snapshot.pk)

    def favorite(self, request, item_id):
        self.require_view(request)
        if request.method != "POST":
            return HttpResponseNotAllowed(["POST"])
        if not 0 < item_id <= 2147483647 or request.POST.get("action") not in ("add", "remove"):
            messages.error(request, "Favorito inválido.")
        else:
            criteria = {"user": request.user, "source": observation_source(), "item_id": item_id}
            if request.POST["action"] == "add":
                ItemObservationFavorite.objects.get_or_create(**criteria)
            else:
                ItemObservationFavorite.objects.filter(**criteria).delete()
        return redirect(PREFIX + "monitor")

    def detail(self, request, pk):
        context = self.context(request, "Detalhes do snapshot")
        snapshot = get_object_or_404(ItemObservationSnapshot, pk=pk)
        context.update(snapshot=snapshot, page_obj=Paginator(snapshot.details.all(), 100).get_page(request.GET.get("page")))
        return TemplateResponse(request, "admin/server/item_observation/detail.html", context)

    def compare(self, request):
        context = self.context(request, "Comparar snapshots de itens")
        form = ComparisonForm(request.GET or None)
        context["form"] = form
        if form.is_valid():
            try:
                rows = compare_snapshots(form.cleaned_data["before"], form.cleaned_data["after"])
                context["page_obj"] = Paginator(rows, 100).get_page(request.GET.get("page"))
            except ObservationUnavailable as exc:
                form.add_error(None, str(exc))
        return TemplateResponse(request, "admin/server/item_observation/compare.html", context)
