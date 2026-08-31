from rest_framework import serializers


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


class RegisterGameAccountSerializer(serializers.Serializer):
    password = serializers.CharField(min_length=6, write_only=True)


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
