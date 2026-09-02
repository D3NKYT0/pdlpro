from rest_framework import serializers


class ServerInfoSerializer(serializers.Serializer):
    name = serializers.CharField()
    description = serializers.CharField()
    chronicle = serializers.CharField()
    rates = serializers.DictField(child=serializers.CharField())
    enchant = serializers.DictField(child=serializers.CharField())
    max_level = serializers.IntegerField()
    features = serializers.ListField(child=serializers.CharField())
    notes = serializers.DictField(child=serializers.CharField())


class ServerStatusSerializer(serializers.Serializer):
    game_online = serializers.BooleanField()
    login_online = serializers.BooleanField()
    players_online = serializers.IntegerField()


class RankingEntrySerializer(serializers.Serializer):
    position = serializers.IntegerField()
    name = serializers.CharField()
    value = serializers.IntegerField()
    extra = serializers.DictField()


class GameAccountSerializer(serializers.Serializer):
    login = serializers.CharField()
    email = serializers.CharField()
    linked_user_id = serializers.CharField(allow_null=True)


class AccessibleAccountSerializer(serializers.Serializer):
    login = serializers.CharField()
    is_primary = serializers.BooleanField()
    linked = serializers.BooleanField()


class GameCharacterSerializer(serializers.Serializer):
    char_id = serializers.IntegerField()
    name = serializers.CharField()
    level = serializers.IntegerField()
    online = serializers.BooleanField()
    sex = serializers.IntegerField()
    pvp = serializers.IntegerField()
    pk = serializers.IntegerField()
    class_id = serializers.IntegerField()
    title = serializers.CharField(allow_blank=True)
    clan_name = serializers.CharField(allow_blank=True)
    is_clan_leader = serializers.BooleanField()


class RegisterGameAccountSerializer(serializers.Serializer):
    password = serializers.CharField(min_length=6, write_only=True)
    login = serializers.CharField(required=False, allow_blank=True, max_length=16)

    def validate_login(self, value: str) -> str:
        login = (value or "").strip()
        if not login:
            return ""
        if not login.isalnum() or not (3 <= len(login) <= 16):
            raise serializers.ValidationError("Use 3 a 16 letras ou números, sem espaços.")
        return login


class PrimaryLoginStateSerializer(serializers.Serializer):
    login = serializers.CharField()
    status = serializers.CharField()


class LinkGameAccountSerializer(serializers.Serializer):
    login = serializers.CharField(max_length=45)
    password = serializers.CharField(write_only=True)


class UnlinkGameAccountSerializer(serializers.Serializer):
    login = serializers.CharField(max_length=45)


class UpdateGamePasswordSerializer(serializers.Serializer):
    login = serializers.CharField(required=False, allow_blank=True)
    password = serializers.CharField(min_length=6, write_only=True)


class ChangeNicknameSerializer(serializers.Serializer):
    login = serializers.CharField()
    char_id = serializers.IntegerField()
    name = serializers.CharField(max_length=16)


class ChangeSexSerializer(serializers.Serializer):
    login = serializers.CharField()
    char_id = serializers.IntegerField()
    sex = serializers.ChoiceField(choices=["M", "F"])


class UnstuckSerializer(serializers.Serializer):
    login = serializers.CharField()
    char_id = serializers.IntegerField()


class PurchaseSlotSerializer(serializers.Serializer):
    quantity = serializers.IntegerField(min_value=1, max_value=10)
