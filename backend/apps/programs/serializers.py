from rest_framework import serializers

from apps.programs.models import (
    CommissionPayout,
    RoadmapEntry,
    Supporter,
    SystemResource,
)


class SupporterSerializer(serializers.ModelSerializer):
    """Representa e valida o cadastro de apoiador; os campos de revisão seguem as restrições de
    Meta.

    Instancie com ``data=payload`` e chame ``is_valid(raise_exception=True)`` antes de consumir
    validated_data. A autorização pertence ao fluxo chamador.

    Campos declarados: ``username``.
    """

    username = serializers.CharField(source="user.username", read_only=True)

    def validate_image(self, image):
        if image and image.size > 5 * 1024 * 1024:
            raise serializers.ValidationError("A imagem deve ter no máximo 5 MB.")
        return image

    class Meta:
        model = Supporter
        fields = [
            "id",
            "username",
            "name",
            "channel_url",
            "description",
            "image",
            "status",
            "review_note",
            "commission_percent",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "username",
            "status",
            "review_note",
            "commission_percent",
            "created_at",
        ]


class SupporterReviewSerializer(serializers.Serializer):
    """Valida o parecer administrativo e as condições do cadastro de apoiador.

    Instancie com ``data=payload`` e chame ``is_valid(raise_exception=True)`` antes de consumir
    validated_data. A autorização pertence ao fluxo chamador.

    Campos declarados: ``status``, ``review_note``, ``commission_percent``.
    """

    status = serializers.ChoiceField(choices=["approved", "rejected"])
    review_note = serializers.CharField(max_length=2000, allow_blank=True, default="")
    commission_percent = serializers.DecimalField(
        max_digits=5, decimal_places=2, min_value=0, max_value=100, default=0
    )


class PayoutSerializer(serializers.ModelSerializer):
    """Representa o pedido de repasse das comissões de um apoiador.

    Use ``Serializer(instancia).data`` (com o nome desta classe) para representar a saída;
    ``many=True`` representa uma coleção.

    Campos declarados: ``supporter_name``.
    """

    supporter_name = serializers.CharField(source="supporter.name", read_only=True)

    class Meta:
        model = CommissionPayout
        fields = ["id", "supporter_name", "amount", "status", "note", "created_at"]


class PayoutReviewSerializer(serializers.Serializer):
    """Valida o estado e a observação usados pela equipe na revisão de um repasse.

    Instancie com ``data=payload`` e chame ``is_valid(raise_exception=True)`` antes de consumir
    validated_data. A autorização pertence ao fluxo chamador.

    Campos declarados: ``status``, ``note``.
    """

    status = serializers.ChoiceField(choices=["paid", "rejected"])
    note = serializers.CharField(max_length=300, allow_blank=True, default="")


class RoadmapSerializer(serializers.ModelSerializer):
    """Representa e valida uma entrada do roadmap, incluindo publicação e progresso.

    Instancie com ``data=payload`` e chame ``is_valid(raise_exception=True)`` antes de consumir
    validated_data. A autorização pertence ao fluxo chamador.

    Campos declarados: ``id``, ``title``, ``description``, ``category``, ``status``,
    ``progress``, ``target_date``, ``published``, ``order``, ``updated_at``.
    """

    class Meta:
        model = RoadmapEntry
        fields = [
            "id",
            "title",
            "description",
            "category",
            "status",
            "progress",
            "target_date",
            "published",
            "order",
            "updated_at",
        ]
        read_only_fields = ["id", "updated_at"]

    def validate(self, data):
        if data.get("status") == "completed":
            data["progress"] = 100
        return data


class ResourceSerializer(serializers.ModelSerializer):
    """Representa e valida a configuração de ativação de um recurso do painel.

    Instancie com ``data=payload`` e chame ``is_valid(raise_exception=True)`` antes de consumir
    validated_data. A autorização pertence ao fluxo chamador.

    Campos declarados: ``id``, ``code``, ``name``, ``category``, ``enabled``, ``description``.
    """

    class Meta:
        model = SystemResource
        fields = ["id", "code", "name", "category", "enabled", "description"]
        read_only_fields = ["id", "code", "name", "category", "description"]
