import logging

from django.utils.translation import gettext as _
from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response

from apps.server.application.item_observation import (
    CaptureObservationSnapshotUseCase,
    CaptureSnapshotInput,
    CompareObservationSnapshotsUseCase,
    CompareSnapshotsInput,
    DeleteObservationCategoryUseCase,
    DeleteObservationSnapshotUseCase,
    GetObservationCategoryUseCase,
    GetObservationSnapshotUseCase,
    ListLiveObservationUseCase,
    ListObservationCategoriesUseCase,
    ListObservationSnapshotsUseCase,
    LiveObservationInput,
    ObservationUnavailable,
    PageInput,
    SetFavoriteInput,
    SetObservationFavoriteUseCase,
    SnapshotDetailInput,
    UpsertCategoryInput,
    UpsertObservationCategoryUseCase,
)
from common.architecture.exceptions import DomainError
from common.permissions import IsStaffMember
from common.views import InjectedAPIView

logger = logging.getLogger(__name__)


class CanObserveItems(BasePermission):
    """Permissão DRF que controla o acesso à observação administrativa de itens.

    Reutilize nas views de captura, comparação e organização das observações. ``has_permission``
    concentra os critérios de acesso ao recurso.
    """

    def has_permission(self, request, view):
        return request.user.has_perm("server.view_itemobservationsnapshot")


class PageQuery(serializers.Serializer):
    """Valida os parâmetros de paginação das consultas de observação de itens.

    Instancie com ``data=payload`` e chame ``is_valid(raise_exception=True)`` antes de consumir
    validated_data. A autorização pertence ao fluxo chamador.

    Campos declarados: ``page``.
    """

    page = serializers.IntegerField(default=1, min_value=1, max_value=1000000)


class ItemQuery(PageQuery):
    """Acrescenta filtros de itens à paginação das consultas de observação.

    Instancie com ``data=payload`` e chame ``is_valid(raise_exception=True)`` antes de consumir
    validated_data. A autorização pertence ao fluxo chamador.

    Campos declarados: ``search``, ``minimum``, ``category``, ``favorites``, ``sort``.
    """

    search = serializers.CharField(default="", allow_blank=True, max_length=100)
    minimum = serializers.IntegerField(default=0, min_value=0, max_value=10**30 - 1)
    category = serializers.CharField(default="", allow_blank=True, max_length=100)
    favorites = serializers.BooleanField(default=False)
    sort = serializers.ChoiceField(
        default="quantity", choices=["quantity", "unique_owners", "instances", "name"]
    )


class CaptureInput(serializers.Serializer):
    """Valida os parâmetros para criar uma captura de observação de itens.

    Instancie com ``data=payload`` e chame ``is_valid(raise_exception=True)`` antes de consumir
    validated_data. A autorização pertence ao fluxo chamador.

    Campos declarados: ``notes``.
    """

    notes = serializers.CharField(default="", allow_blank=True, max_length=2000)


class FavoriteInput(serializers.Serializer):
    """Valida o item e os parâmetros da atualização de favoritos de observação.

    Instancie com ``data=payload`` e chame ``is_valid(raise_exception=True)`` antes de consumir
    validated_data. A autorização pertence ao fluxo chamador.

    Campos declarados: ``active``.
    """

    active = serializers.BooleanField()


class ComparisonQuery(PageQuery):
    """Valida a seleção e os filtros para comparar capturas de observação.

    Instancie com ``data=payload`` e chame ``is_valid(raise_exception=True)`` antes de consumir
    validated_data. A autorização pertence ao fluxo chamador.

    Campos declarados: ``before``, ``after``.
    """

    before = serializers.UUIDField()
    after = serializers.UUIDField()


class CategorySerializer(serializers.Serializer):
    """Representa e valida uma categoria usada para organizar observações (dict)."""

    id = serializers.UUIDField(read_only=True)
    name = serializers.CharField(max_length=100)
    description = serializers.CharField(allow_blank=True, required=False, default="")
    item_ids = serializers.JSONField(required=False, default=list)
    order = serializers.IntegerField(min_value=0, required=False, default=0)

    def validate_item_ids(self, value):
        if (
            not isinstance(value, list)
            or len(value) > 2000
            or any(type(item) is not int or not 0 < item <= 2147483647 for item in value)
            or len(set(value)) != len(value)
        ):
            raise serializers.ValidationError(
                _("Informe uma lista de até 2000 IDs positivos, sem repetições.")
            )
        return value


class SnapshotSerializer(serializers.Serializer):
    """Representa os metadados de uma captura persistida de observação de itens (dict)."""

    id = serializers.UUIDField(read_only=True)
    snapshot_date = serializers.DateField(read_only=True)
    source = serializers.CharField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    created_by = serializers.CharField(read_only=True, allow_null=True)
    notes = serializers.CharField(read_only=True)
    total_characters = serializers.IntegerField(read_only=True)
    total_instances = serializers.IntegerField(read_only=True)
    total_quantity = serializers.IntegerField(read_only=True)
    site_quantity = serializers.IntegerField(read_only=True)


def query(serializer_class, request):
    serializer = serializer_class(data=request.query_params)
    serializer.is_valid(raise_exception=True)
    return serializer.validated_data


class ObservationView(InjectedAPIView):
    """Base das consultas administrativas de itens, com verificação de permissões e tratamento de
    indisponibilidade.

    Usa os handlers herdados ou associados nesta classe. As opções abaixo especializam o
    comportamento da view base. Controle de acesso declarado: [IsAuthenticated, IsStaffMember,
    CanObserveItems]. Resolve casos de uso do ServerProvider.
    """

    permission_classes = [IsAuthenticated, IsStaffMember, CanObserveItems]

    def require(self, permission):
        if not self.request.user.has_perm(f"server.{permission}"):
            raise PermissionDenied(_("Você não tem permissão para esta ação."))

    def safely(self, callback, unavailable_status=503):
        try:
            return callback()
        except ObservationUnavailable as exc:
            raise ObservationUnavailable(str(exc), status_code=unavailable_status) from None
        except DomainError:
            raise
        except Exception as exc:
            logger.exception("Falha na observação de itens L2")
            raise DomainError(
                _("Não foi possível consultar os itens. Confira a conexão L2 e o módulo SQL."),
                error_code="ITEM_OBSERVATION_UNAVAILABLE",
                status_code=503,
            ) from exc


class ObservationAccessView(ObservationView):
    """Informa quais ações de observação de itens o usuário pode executar.

    Implementa GET; registre ``as_view()`` nas URLs do módulo. Usa as permissões herdadas da
    base ou definidas nos padrões do DRF.
    """

    @extend_schema(
        tags=["Staff - Observação de itens"],
        summary="Permissões de observação",
        description="Informa quais ações de observação de itens o usuário autenticado pode executar.",
    )
    def get(self, request):
        return Response(
            {
                key: request.user.has_perm(f"server.{permission}")
                for key, permission in {
                    "capture": "capture_itemobservationsnapshot",
                    "delete_snapshots": "delete_itemobservationsnapshot",
                    "add_categories": "add_itemobservationcategory",
                    "change_categories": "change_itemobservationcategory",
                    "delete_categories": "delete_itemobservationcategory",
                }.items()
            }
        )


class ObservationLiveView(ObservationView):
    """Consulta ao vivo a distribuição de itens no servidor L2.

    Implementa GET; registre ``as_view()`` nas URLs do módulo. Resolve
    ``ListLiveObservationUseCase`` no escopo da requisição.
    """

    @extend_schema(
        tags=["Staff - Observação de itens"],
        summary="Observação ao vivo",
        description="Consulta a distribuição atual de itens no servidor L2 com filtros e paginação.",
        parameters=[ItemQuery],
    )
    def get(self, request):
        options = query(ItemQuery, request)
        payload = self.safely(
            lambda: self.resolve(ListLiveObservationUseCase).execute(
                LiveObservationInput(
                    user_id=request.user.id,
                    search=options["search"],
                    minimum=options["minimum"],
                    category=options["category"],
                    favorites=options["favorites"],
                    sort=options["sort"],
                    page=options["page"],
                )
            )
        )
        return Response(
            {
                **payload,
                "categories": CategorySerializer(payload["categories"], many=True).data,
            }
        )


class ObservationFavoriteView(ObservationView):
    """Adiciona ou remove um item dos favoritos de observação.

    Implementa PUT; registre ``as_view()`` nas URLs do módulo. Usa as permissões herdadas da
    base ou definidas nos padrões do DRF.
    """

    @extend_schema(
        tags=["Staff - Observação de itens"],
        summary="Atualizar favorito",
        description="Adiciona ou remove o item informado dos favoritos de observação do usuário.",
        request=FavoriteInput,
    )
    def put(self, request, item_id):
        if not 0 < item_id <= 2147483647:
            raise serializers.ValidationError({"item_id": _("ID de item inválido.")})
        serializer = FavoriteInput(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(
            self.resolve(SetObservationFavoriteUseCase).execute(
                SetFavoriteInput(
                    user_id=request.user.id,
                    item_id=item_id,
                    active=serializer.validated_data["active"],
                )
            )
        )


class ObservationSnapshotsView(ObservationView):
    """Lista e cria capturas persistidas de observação de itens.

    Implementa GET, POST; registre ``as_view()`` nas URLs do módulo. Resolve casos de uso do
    ServerProvider.
    """

    @extend_schema(
        tags=["Staff - Observação de itens"],
        summary="Listar capturas",
        description="Lista as capturas persistidas de observação de itens com paginação.",
        parameters=[PageQuery],
        responses=SnapshotSerializer(many=True),
    )
    def get(self, request):
        page = query(PageQuery, request)["page"]
        payload = self.resolve(ListObservationSnapshotsUseCase).execute(PageInput(page=page))
        return Response(
            {
                **payload,
                "results": SnapshotSerializer(payload["results"], many=True).data,
            }
        )

    @extend_schema(
        tags=["Staff - Observação de itens"],
        summary="Criar captura",
        description="Captura o estado atual da observação de itens e persiste um novo snapshot.",
        request=CaptureInput,
        responses={201: SnapshotSerializer},
    )
    def post(self, request):
        self.require("capture_itemobservationsnapshot")
        serializer = CaptureInput(data=request.data)
        serializer.is_valid(raise_exception=True)
        snapshot = self.safely(
            lambda: self.resolve(CaptureObservationSnapshotUseCase).execute(
                CaptureSnapshotInput(user=request.user, notes=serializer.validated_data["notes"])
            ),
            unavailable_status=409,
        )
        return Response(SnapshotSerializer(snapshot).data, status=201)


class ObservationSnapshotView(ObservationView):
    """Consulta detalhes de uma captura persistida ou a exclui mediante permissão.

    Implementa GET, DELETE; registre ``as_view()`` nas URLs do módulo. Usa as permissões
    herdadas da base ou definidas nos padrões do DRF.
    """

    @extend_schema(
        tags=["Staff - Observação de itens"],
        summary="Detalhe da captura",
        description="Retorna os metadados e os detalhes paginados de uma captura de observação.",
        parameters=[PageQuery],
        responses=SnapshotSerializer,
    )
    def get(self, request, snapshot_id):
        page = query(PageQuery, request)["page"]
        payload = self.resolve(GetObservationSnapshotUseCase).execute(
            SnapshotDetailInput(snapshot_id=snapshot_id, page=page)
        )
        return Response(
            {
                **payload,
                "snapshot": SnapshotSerializer(payload["snapshot"]).data,
            }
        )

    @extend_schema(
        tags=["Staff - Observação de itens"],
        summary="Excluir captura",
        description="Remove permanentemente a captura de observação identificada pelo ID.",
        responses={204: None},
    )
    def delete(self, request, snapshot_id):
        self.require("delete_itemobservationsnapshot")
        self.resolve(DeleteObservationSnapshotUseCase).execute(snapshot_id)
        return Response(status=204)


class ObservationComparisonView(ObservationView):
    """Compara duas capturas de observação e pagina as diferenças encontradas.

    Implementa GET; registre ``as_view()`` nas URLs do módulo. Usa as permissões herdadas da
    base ou definidas nos padrões do DRF.
    """

    @extend_schema(
        tags=["Staff - Observação de itens"],
        summary="Comparar capturas",
        description="Compara duas capturas de observação e pagina as diferenças encontradas entre elas.",
        parameters=[ComparisonQuery],
        responses=SnapshotSerializer,
    )
    def get(self, request):
        options = query(ComparisonQuery, request)
        payload = self.safely(
            lambda: self.resolve(CompareObservationSnapshotsUseCase).execute(
                CompareSnapshotsInput(
                    before_id=options["before"],
                    after_id=options["after"],
                    page=options["page"],
                )
            ),
            unavailable_status=400,
        )
        return Response(
            {
                **payload,
                "before": SnapshotSerializer(payload["before"]).data,
                "after": SnapshotSerializer(payload["after"]).data,
            }
        )


class ObservationCategoriesView(ObservationView):
    """Lista ou cria categorias para organizar capturas de observação.

    Implementa GET, POST; registre ``as_view()`` nas URLs do módulo. Usa as permissões herdadas
    da base ou definidas nos padrões do DRF.
    """

    @extend_schema(
        tags=["Staff - Observação de itens"],
        summary="Listar categorias",
        description="Lista as categorias usadas para organizar a observação de itens.",
        responses=CategorySerializer(many=True),
    )
    def get(self, request):
        rows = self.resolve(ListObservationCategoriesUseCase).execute()
        return Response(CategorySerializer(rows, many=True).data)

    @extend_schema(
        tags=["Staff - Observação de itens"],
        summary="Criar categoria",
        description="Cria uma nova categoria para organizar itens na observação administrativa.",
        request=CategorySerializer,
        responses={201: CategorySerializer},
    )
    def post(self, request):
        self.require("add_itemobservationcategory")
        serializer = CategorySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        row = self.resolve(UpsertObservationCategoryUseCase).execute(
            UpsertCategoryInput(validated_data=serializer.validated_data)
        )
        return Response(CategorySerializer(row).data, status=201)


class ObservationCategoryView(ObservationView):
    """Atualiza ou exclui uma categoria de observação mediante permissão.

    Implementa PUT, DELETE; registre ``as_view()`` nas URLs do módulo. Usa as permissões
    herdadas da base ou definidas nos padrões do DRF.
    """

    @extend_schema(
        tags=["Staff - Observação de itens"],
        summary="Atualizar categoria",
        description="Atualiza os dados de uma categoria de observação existente.",
        request=CategorySerializer,
        responses=CategorySerializer,
    )
    def put(self, request, category_id):
        self.require("change_itemobservationcategory")
        existing = self.resolve(GetObservationCategoryUseCase).execute(category_id)
        serializer = CategorySerializer(existing, data=request.data)
        serializer.is_valid(raise_exception=True)
        row = self.resolve(UpsertObservationCategoryUseCase).execute(
            UpsertCategoryInput(validated_data=serializer.validated_data, category_id=category_id)
        )
        return Response(CategorySerializer(row).data)

    @extend_schema(
        tags=["Staff - Observação de itens"],
        summary="Excluir categoria",
        description="Remove permanentemente a categoria de observação identificada pelo ID.",
        responses={204: None},
    )
    def delete(self, request, category_id):
        self.require("delete_itemobservationcategory")
        self.resolve(DeleteObservationCategoryUseCase).execute(category_id)
        return Response(status=204)
