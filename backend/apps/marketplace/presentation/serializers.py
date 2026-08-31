from rest_framework import serializers


class CreateListingSerializer(serializers.Serializer):
    login = serializers.CharField(max_length=45, required=False, allow_blank=True, default="")
    char_id = serializers.IntegerField(min_value=1)
    price = serializers.DecimalField(max_digits=12, decimal_places=2)
    notes = serializers.CharField(required=False, allow_blank=True, default="")
