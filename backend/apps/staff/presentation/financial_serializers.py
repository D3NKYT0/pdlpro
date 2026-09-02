from rest_framework import serializers


class ReportFiltersSerializer(serializers.Serializer):
    """Contrato de dados de ``ReportFiltersSerializer`` na API de staff.

    Campos declarados: ``username``, ``page``, ``page_size``.

    Na entrada, chame ``is_valid(raise_exception=True)`` antes de ler validated_data; na saída,
    leia data. Respeite os campos read_only/write_only.
    """

    username = serializers.CharField(required=False, allow_blank=True, max_length=150)
    page = serializers.IntegerField(default=1, min_value=1)
    page_size = serializers.IntegerField(default=20, min_value=1, max_value=50)


class BalanceFiltersSerializer(ReportFiltersSerializer):
    """Contrato de dados de ``BalanceFiltersSerializer`` na API de staff.

    Campos declarados: ``status``, ``minimum``, ``maximum``.

    Na entrada, chame ``is_valid(raise_exception=True)`` antes de ler validated_data; na saída,
    leia data. Respeite os campos read_only/write_only.
    """

    status = serializers.ChoiceField(choices=["consistent", "review", "discrepancy", "no_wallet"], required=False)
    minimum = serializers.DecimalField(max_digits=24, decimal_places=2, required=False)
    maximum = serializers.DecimalField(max_digits=24, decimal_places=2, required=False)

    def validate(self, attrs):
        if attrs.get("minimum") is not None and attrs.get("maximum") is not None and attrs["minimum"] > attrs["maximum"]:
            raise serializers.ValidationError({"maximum": "O máximo deve ser maior ou igual ao mínimo."})
        return attrs


class CashFlowFiltersSerializer(ReportFiltersSerializer):
    """Contrato de dados de ``CashFlowFiltersSerializer`` na API de staff.

    Campos declarados: ``date_from``, ``date_to``.

    Na entrada, chame ``is_valid(raise_exception=True)`` antes de ler validated_data; na saída,
    leia data. Respeite os campos read_only/write_only.
    """

    date_from = serializers.DateField(required=False)
    date_to = serializers.DateField(required=False)

    def validate(self, attrs):
        if attrs.get("date_from") and attrs.get("date_to") and attrs["date_from"] > attrs["date_to"]:
            raise serializers.ValidationError({"date_to": "A data final deve ser igual ou posterior à inicial."})
        return attrs


class PaymentFiltersSerializer(CashFlowFiltersSerializer, BalanceFiltersSerializer):
    """Contrato de dados de ``PaymentFiltersSerializer`` na API de staff.

    Campos declarados: ``status``, ``method``, ``currency``.

    Na entrada, chame ``is_valid(raise_exception=True)`` antes de ler validated_data; na saída,
    leia data. Respeite os campos read_only/write_only.
    """

    status = serializers.ChoiceField(choices=["pending", "processing", "confirmed", "cancelled", "failed"], required=False)
    method = serializers.CharField(required=False, max_length=20)
    currency = serializers.ChoiceField(choices=["BRL", "USD"], required=False)

    def validate(self, attrs):
        CashFlowFiltersSerializer.validate(self, attrs)
        return BalanceFiltersSerializer.validate(self, attrs)


class BalanceRowSerializer(serializers.Serializer):
    """Contrato de dados de ``BalanceRowSerializer`` na API de staff.

    Campos declarados: ``username``, ``balance``, ``bonus_balance``, ``total_balance``,
    ``calculated_balance``, ``difference``, ``credits``, ``debits``, ``transaction_count``,
    ``credit_count``, ``debit_count``, ``first_transaction``, ``last_transaction``,
    ``report_status``.

    Na entrada, chame ``is_valid(raise_exception=True)`` antes de ler validated_data; na saída,
    leia data. Respeite os campos read_only/write_only.
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
    """Contrato de dados de ``CashFlowRowSerializer`` na API de staff.

    Campos declarados: ``day``, ``credits``, ``debits``, ``net``, ``accumulated``,
    ``transaction_count``, ``credit_count``, ``debit_count``.

    Na entrada, chame ``is_valid(raise_exception=True)`` antes de ler validated_data; na saída,
    leia data. Respeite os campos read_only/write_only.
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
    """Contrato de dados de ``PaymentRowSerializer`` na API de staff.

    Campos declarados: ``id``, ``username``, ``amount``, ``currency``, ``coins``,
    ``bonus_applied``, ``total_credited``, ``status``, ``method``, ``payment_source``,
    ``created_at``, ``paid_at``.

    Na entrada, chame ``is_valid(raise_exception=True)`` antes de ler validated_data; na saída,
    leia data. Respeite os campos read_only/write_only.
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
    """Contrato de dados de ``ReportResponseSerializer`` na API de staff.

    Campos declarados: ``count``, ``total_pages``, ``next``, ``previous``, ``summary``.

    Na entrada, chame ``is_valid(raise_exception=True)`` antes de ler validated_data; na saída,
    leia data. Respeite os campos read_only/write_only.
    """

    count = serializers.IntegerField()
    total_pages = serializers.IntegerField()
    next = serializers.URLField(allow_null=True)
    previous = serializers.URLField(allow_null=True)
    summary = serializers.DictField()


class BalanceReportSerializer(ReportResponseSerializer):
    """Contrato de dados de ``BalanceReportSerializer`` na API de staff.

    Campos declarados: ``results``.

    Na entrada, chame ``is_valid(raise_exception=True)`` antes de ler validated_data; na saída,
    leia data. Respeite os campos read_only/write_only.
    """

    results = BalanceRowSerializer(many=True)


class CashFlowReportSerializer(ReportResponseSerializer):
    """Contrato de dados de ``CashFlowReportSerializer`` na API de staff.

    Campos declarados: ``results``.

    Na entrada, chame ``is_valid(raise_exception=True)`` antes de ler validated_data; na saída,
    leia data. Respeite os campos read_only/write_only.
    """

    results = CashFlowRowSerializer(many=True)


class PaymentReportSerializer(ReportResponseSerializer):
    """Contrato de dados de ``PaymentReportSerializer`` na API de staff.

    Campos declarados: ``results``.

    Na entrada, chame ``is_valid(raise_exception=True)`` antes de ler validated_data; na saída,
    leia data. Respeite os campos read_only/write_only.
    """

    results = PaymentRowSerializer(many=True)
