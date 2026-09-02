from rest_framework import serializers


class ServerInfoSerializer(serializers.Serializer):
    """Contrato de dados de ``ServerInfoSerializer`` na API de server.

    Campos declarados: ``name``, ``description``, ``chronicle``, ``rates``, ``enchant``,
    ``max_level``, ``features``, ``notes``.

    Na entrada, chame ``is_valid(raise_exception=True)`` antes de ler validated_data; na saída,
    leia data. Respeite os campos read_only/write_only.
    """

    name = serializers.CharField()
    description = serializers.CharField()
    chronicle = serializers.CharField()
    rates = serializers.DictField(child=serializers.CharField())
    enchant = serializers.DictField(child=serializers.CharField())
    max_level = serializers.IntegerField()
    features = serializers.ListField(child=serializers.CharField())
    notes = serializers.DictField(child=serializers.CharField())


class ServerStatusSerializer(serializers.Serializer):
    """Contrato de dados de ``ServerStatusSerializer`` na API de server.

    Campos declarados: ``game_online``, ``login_online``, ``players_online``.

    Na entrada, chame ``is_valid(raise_exception=True)`` antes de ler validated_data; na saída,
    leia data. Respeite os campos read_only/write_only.
    """

    game_online = serializers.BooleanField()
    login_online = serializers.BooleanField()
    players_online = serializers.IntegerField()


class RankingEntrySerializer(serializers.Serializer):
    """Contrato de dados de ``RankingEntrySerializer`` na API de server.

    Campos declarados: ``position``, ``name``, ``value``, ``extra``.

    Na entrada, chame ``is_valid(raise_exception=True)`` antes de ler validated_data; na saída,
    leia data. Respeite os campos read_only/write_only.
    """

    position = serializers.IntegerField()
    name = serializers.CharField()
    value = serializers.IntegerField()
    extra = serializers.DictField()


class GameAccountSerializer(serializers.Serializer):
    """Contrato de dados de ``GameAccountSerializer`` na API de server.

    Campos declarados: ``login``, ``email``, ``linked_user_id``.

    Na entrada, chame ``is_valid(raise_exception=True)`` antes de ler validated_data; na saída,
    leia data. Respeite os campos read_only/write_only.
    """

    login = serializers.CharField()
    email = serializers.CharField()
    linked_user_id = serializers.CharField(allow_null=True)


class AccessibleAccountSerializer(serializers.Serializer):
    """Contrato de dados de ``AccessibleAccountSerializer`` na API de server.

    Campos declarados: ``login``, ``is_primary``, ``linked``.

    Na entrada, chame ``is_valid(raise_exception=True)`` antes de ler validated_data; na saída,
    leia data. Respeite os campos read_only/write_only.
    """

    login = serializers.CharField()
    is_primary = serializers.BooleanField()
    linked = serializers.BooleanField()


class GameCharacterSerializer(serializers.Serializer):
    """Contrato de dados de ``GameCharacterSerializer`` na API de server.

    Campos declarados: ``char_id``, ``name``, ``level``, ``online``, ``sex``, ``pvp``, ``pk``,
    ``class_id``, ``title``, ``clan_name``, ``is_clan_leader``.

    Na entrada, chame ``is_valid(raise_exception=True)`` antes de ler validated_data; na saída,
    leia data. Respeite os campos read_only/write_only.
    """

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
    """Contrato de dados de ``RegisterGameAccountSerializer`` na API de server.

    Campos declarados: ``password``, ``login``.

    Na entrada, chame ``is_valid(raise_exception=True)`` antes de ler validated_data; na saída,
    leia data. Respeite os campos read_only/write_only.
    """

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
    """Contrato de dados de ``PrimaryLoginStateSerializer`` na API de server.

    Campos declarados: ``login``, ``status``.

    Na entrada, chame ``is_valid(raise_exception=True)`` antes de ler validated_data; na saída,
    leia data. Respeite os campos read_only/write_only.
    """

    login = serializers.CharField()
    status = serializers.CharField()


class LinkGameAccountSerializer(serializers.Serializer):
    """Contrato de dados de ``LinkGameAccountSerializer`` na API de server.

    Campos declarados: ``login``, ``password``.

    Na entrada, chame ``is_valid(raise_exception=True)`` antes de ler validated_data; na saída,
    leia data. Respeite os campos read_only/write_only.
    """

    login = serializers.CharField(max_length=45)
    password = serializers.CharField(write_only=True)


class UnlinkGameAccountSerializer(serializers.Serializer):
    """Contrato de dados de ``UnlinkGameAccountSerializer`` na API de server.

    Campos declarados: ``login``.

    Na entrada, chame ``is_valid(raise_exception=True)`` antes de ler validated_data; na saída,
    leia data. Respeite os campos read_only/write_only.
    """

    login = serializers.CharField(max_length=45)


class UpdateGamePasswordSerializer(serializers.Serializer):
    """Contrato de dados de ``UpdateGamePasswordSerializer`` na API de server.

    Campos declarados: ``login``, ``password``.

    Na entrada, chame ``is_valid(raise_exception=True)`` antes de ler validated_data; na saída,
    leia data. Respeite os campos read_only/write_only.
    """

    login = serializers.CharField(required=False, allow_blank=True)
    password = serializers.CharField(min_length=6, write_only=True)


class ChangeNicknameSerializer(serializers.Serializer):
    """Contrato de dados de ``ChangeNicknameSerializer`` na API de server.

    Campos declarados: ``login``, ``char_id``, ``name``.

    Na entrada, chame ``is_valid(raise_exception=True)`` antes de ler validated_data; na saída,
    leia data. Respeite os campos read_only/write_only.
    """

    login = serializers.CharField()
    char_id = serializers.IntegerField()
    name = serializers.CharField(max_length=16)


class ChangeSexSerializer(serializers.Serializer):
    """Contrato de dados de ``ChangeSexSerializer`` na API de server.

    Campos declarados: ``login``, ``char_id``, ``sex``.

    Na entrada, chame ``is_valid(raise_exception=True)`` antes de ler validated_data; na saída,
    leia data. Respeite os campos read_only/write_only.
    """

    login = serializers.CharField()
    char_id = serializers.IntegerField()
    sex = serializers.ChoiceField(choices=["M", "F"])


class UnstuckSerializer(serializers.Serializer):
    """Contrato de dados de ``UnstuckSerializer`` na API de server.

    Campos declarados: ``login``, ``char_id``.

    Na entrada, chame ``is_valid(raise_exception=True)`` antes de ler validated_data; na saída,
    leia data. Respeite os campos read_only/write_only.
    """

    login = serializers.CharField()
    char_id = serializers.IntegerField()


class PurchaseSlotSerializer(serializers.Serializer):
    """Contrato de dados de ``PurchaseSlotSerializer`` na API de server.

    Campos declarados: ``quantity``.

    Na entrada, chame ``is_valid(raise_exception=True)`` antes de ler validated_data; na saída,
    leia data. Respeite os campos read_only/write_only.
    """

    quantity = serializers.IntegerField(min_value=1, max_value=10)
