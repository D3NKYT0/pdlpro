from rest_framework import serializers


class ReportFiltersSerializer(serializers.Serializer):
    """Valida filtros e paginação comuns às consultas de relatórios financeiros.

    Instancie com ``data=payload`` e chame ``is_valid(raise_exception=True)`` antes de consumir
    validated_data. A autorização pertence ao fluxo chamador.

    Campos declarados: ``username``, ``page``, ``page_size``.
    """

    username = serializers.CharField(required=False, allow_blank=True, max_length=150)
    page = serializers.IntegerField(default=1, min_value=1)
    page_size = serializers.IntegerField(default=20, min_value=1, max_value=50)


class BalanceFiltersSerializer(ReportFiltersSerializer):
    """Especializa a validação dos filtros para relatórios de saldo e conciliação.

    Instancie com ``data=payload`` e chame ``is_valid(raise_exception=True)`` antes de consumir
    validated_data. A autorização pertence ao fluxo chamador.

    Campos declarados: ``status``, ``minimum``, ``maximum``.
    """

    status = serializers.ChoiceField(choices=["consistent", "review", "discrepancy", "no_wallet"], required=False)
    minimum = serializers.DecimalField(max_digits=24, decimal_places=2, required=False)
    maximum = serializers.DecimalField(max_digits=24, decimal_places=2, required=False)

    def validate(self, attrs):
        if attrs.get("minimum") is not None and attrs.get("maximum") is not None and attrs["minimum"] > attrs["maximum"]:
            raise serializers.ValidationError({"maximum": "O máximo deve ser maior ou igual ao mínimo."})
        return attrs


class CashFlowFiltersSerializer(ReportFiltersSerializer):
    """Especializa a validação dos filtros para relatórios de fluxo de caixa.

    Instancie com ``data=payload`` e chame ``is_valid(raise_exception=True)`` antes de consumir
    validated_data. A autorização pertence ao fluxo chamador.

    Campos declarados: ``date_from``, ``date_to``.
    """

    date_from = serializers.DateField(required=False)
    date_to = serializers.DateField(required=False)

    def validate(self, attrs):
        if attrs.get("date_from") and attrs.get("date_to") and attrs["date_from"] > attrs["date_to"]:
            raise serializers.ValidationError({"date_to": "A data final deve ser igual ou posterior à inicial."})
        return attrs


class PaymentFiltersSerializer(CashFlowFiltersSerializer, BalanceFiltersSerializer):
    """Especializa a validação dos filtros para relatórios de pagamentos.

    Instancie com ``data=payload`` e chame ``is_valid(raise_exception=True)`` antes de consumir
    validated_data. A autorização pertence ao fluxo chamador.

    Campos declarados: ``status``, ``method``, ``currency``.
    """

    status = serializers.ChoiceField(choices=["pending", "processing", "confirmed", "cancelled", "failed"], required=False)
    method = serializers.CharField(required=False, max_length=20)
    currency = serializers.ChoiceField(choices=["BRL", "USD"], required=False)

    def validate(self, attrs):
        CashFlowFiltersSerializer.validate(self, attrs)
        return BalanceFiltersSerializer.validate(self, attrs)


class BalanceRowSerializer(serializers.Serializer):
    """Descreve uma linha do relatório de saldos e conciliação no contrato HTTP.

    Use ``Serializer(instancia).data`` (com o nome desta classe) para representar a saída;
    ``many=True`` representa uma coleção.

    Campos declarados: ``username``, ``balance``, ``bonus_balance``, ``total_balance``,
    ``calculated_balance``, ``difference``, ``credits``, ``debits``, ``transaction_count``,
    ``credit_count``, ``debit_count``, ``first_transaction``, ``last_transaction``,
    ``report_status``.
    """

    username = serializers.CharField()
    balance = serializers.DecimalField(max_digits=24, decimal_places=2)
    bonus_balance = serializers.DecimalField(max_digits=24, decimal_places=2)
    total_balance = serializers.DecimalField(max_digits=24, decimal_places=2)
    calculated_balance = serializers.DecimalField(max_digits=24, decimal_places=2)
    difference = serializers.DecimalField(max_digits=24, decimal_places=2)
    credits = serializers.DecimalField(max_digits=24, decimal_places=2)
    debits = serializers.DecimalField(max_digits=24, decimal_places=2)
    transaction_count = serializers.IntegerField()
    credit_count = serializers.IntegerField()
    debit_count = serializers.IntegerField()
    first_transaction = serializers.DateTimeField(allow_null=True)
    last_transaction = serializers.DateTimeField(allow_null=True)
    report_status = serializers.CharField()


class CashFlowRowSerializer(serializers.Serializer):
    """Descreve uma linha do relatório de fluxo de caixa no contrato HTTP.

    Use ``Serializer(instancia).data`` (com o nome desta classe) para representar a saída;
    ``many=True`` representa uma coleção.

    Campos declarados: ``day``, ``credits``, ``debits``, ``net``, ``accumulated``,
    ``transaction_count``, ``credit_count``, ``debit_count``.
    """

    day = serializers.DateField()
    credits = serializers.DecimalField(max_digits=24, decimal_places=2)
    debits = serializers.DecimalField(max_digits=24, decimal_places=2)
    net = serializers.DecimalField(max_digits=24, decimal_places=2)
    accumulated = serializers.DecimalField(max_digits=24, decimal_places=2)
    transaction_count = serializers.IntegerField()
    credit_count = serializers.IntegerField()
    debit_count = serializers.IntegerField()


class PaymentRowSerializer(serializers.Serializer):
    """Descreve uma linha do relatório de pagamentos no contrato HTTP.

    Use ``Serializer(instancia).data`` (com o nome desta classe) para representar a saída;
    ``many=True`` representa uma coleção.

    Campos declarados: ``id``, ``username``, ``amount``, ``currency``, ``coins``,
    ``bonus_applied``, ``total_credited``, ``status``, ``method``, ``payment_source``,
    ``created_at``, ``paid_at``.
    """

    id = serializers.UUIDField()
    username = serializers.CharField()
    amount = serializers.DecimalField(max_digits=24, decimal_places=2)
    currency = serializers.CharField()
    coins = serializers.DecimalField(max_digits=24, decimal_places=2)
    bonus_applied = serializers.DecimalField(max_digits=24, decimal_places=2)
    total_credited = serializers.DecimalField(max_digits=24, decimal_places=2)
    status = serializers.CharField()
    method = serializers.CharField()
    payment_source = serializers.CharField()
    created_at = serializers.DateTimeField()
    paid_at = serializers.DateTimeField(allow_null=True)


class ReportResponseSerializer(serializers.Serializer):
    """Define o envelope financeiro com paginação, linhas e resumo agregado.

    Use ``Serializer(instancia).data`` (com o nome desta classe) para representar a saída;
    ``many=True`` representa uma coleção.

    Campos declarados: ``count``, ``total_pages``, ``next``, ``previous``, ``summary``.
    """

    count = serializers.IntegerField()
    total_pages = serializers.IntegerField()
    next = serializers.URLField(allow_null=True)
    previous = serializers.URLField(allow_null=True)
    summary = serializers.DictField()


class BalanceReportSerializer(ReportResponseSerializer):
    """Especializa o envelope financeiro para linhas de saldo e conciliação.

    Use ``Serializer(instancia).data`` (com o nome desta classe) para representar a saída;
    ``many=True`` representa uma coleção.

    Campos declarados: ``results``.
    """

    results = BalanceRowSerializer(many=True)


class CashFlowReportSerializer(ReportResponseSerializer):
    """Especializa o envelope financeiro para linhas de fluxo de caixa.

    Use ``Serializer(instancia).data`` (com o nome desta classe) para representar a saída;
    ``many=True`` representa uma coleção.

    Campos declarados: ``results``.
    """

    results = CashFlowRowSerializer(many=True)


class PaymentReportSerializer(ReportResponseSerializer):
    """Especializa o envelope financeiro para linhas de pagamentos.

    Use ``Serializer(instancia).data`` (com o nome desta classe) para representar a saída;
    ``many=True`` representa uma coleção.

    Campos declarados: ``results``.
    """

    results = PaymentRowSerializer(many=True)
