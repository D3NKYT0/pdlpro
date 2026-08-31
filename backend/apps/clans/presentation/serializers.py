from rest_framework import serializers


class CreateClanSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=80)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    motd = serializers.CharField(required=False, allow_blank=True, default="")
    focus = serializers.ChoiceField(choices=["PVP", "PVE", "MIXED", "CASUAL"], default="MIXED")
    min_level = serializers.IntegerField(min_value=1, required=False, default=1)
    recruiting = serializers.BooleanField(required=False, default=True)
    clan_id = serializers.IntegerField(min_value=1, required=False, allow_null=True)


class ApplyToClanSerializer(serializers.Serializer):
    char_name = serializers.CharField(max_length=100)
    message = serializers.CharField(required=False, allow_blank=True, default="")


class ReviewApplicationSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=["approved", "rejected"])
