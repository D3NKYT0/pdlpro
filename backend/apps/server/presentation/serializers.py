from rest_framework import serializers


class ServerInfoSerializer(serializers.Serializer):
    """Representa a configuração pública do servidor, incluindo crônica, rates e características.

    Use ``Serializer(instancia).data`` (com o nome desta classe) para representar a saída;
    ``many=True`` representa uma coleção.

    Campos declarados: ``name``, ``description``, ``chronicle``, ``rates``, ``enchant``,
    ``max_level``, ``features``, ``notes``.
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
    """Representa disponibilidade dos servidores de login/jogo e quantidade de jogadores.

    Use ``Serializer(instancia).data`` (com o nome desta classe) para representar a saída;
    ``many=True`` representa uma coleção.

    Campos declarados: ``game_online``, ``login_online``, ``players_online``.
    """

    game_online = serializers.BooleanField()
    login_online = serializers.BooleanField()
    players_online = serializers.IntegerField()


class RankingEntrySerializer(serializers.Serializer):
    """Representa uma posição de ranking com nome, valor e metadados adicionais.

    Use ``Serializer(instancia).data`` (com o nome desta classe) para representar a saída;
    ``many=True`` representa uma coleção.

    Campos declarados: ``position``, ``name``, ``value``, ``extra``.
    """

    position = serializers.IntegerField()
    name = serializers.CharField()
    value = serializers.IntegerField()
    extra = serializers.DictField()


class GameAccountSerializer(serializers.Serializer):
    """Representa uma conta Lineage por login, e-mail e vínculo ao usuário do painel.

    Use ``Serializer(instancia).data`` (com o nome desta classe) para representar a saída;
    ``many=True`` representa uma coleção.

    Campos declarados: ``login``, ``email``, ``linked_user_id``.
    """

    login = serializers.CharField()
    email = serializers.CharField()
    linked_user_id = serializers.CharField(allow_null=True)


class AccessibleAccountSerializer(serializers.Serializer):
    """Representa uma conta disponível para seleção, indicando vínculo e conta principal.

    Use ``Serializer(instancia).data`` (com o nome desta classe) para representar a saída;
    ``many=True`` representa uma coleção.

    Campos declarados: ``login``, ``is_primary``, ``linked``.
    """

    login = serializers.CharField()
    is_primary = serializers.BooleanField()
    linked = serializers.BooleanField()


class GameCharacterSerializer(serializers.Serializer):
    """Representa os dados do personagem retornados pelo gateway, usando char_id inteiro do jogo.

    Use ``Serializer(instancia).data`` (com o nome desta classe) para representar a saída;
    ``many=True`` representa uma coleção.

    Campos declarados: ``char_id``, ``name``, ``level``, ``online``, ``sex``, ``pvp``, ``pk``,
    ``class_id``, ``title``, ``clan_name``, ``is_clan_leader``.
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
    """Valida senha e eventual login alternativo para registrar a conta principal no jogo.

    Instancie com ``data=payload`` e chame ``is_valid(raise_exception=True)`` antes de consumir
    validated_data. A autorização pertence ao fluxo chamador.

    Campos declarados: ``password``, ``login``.
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
    """Representa o estado do login preferido para orientar cadastro ou vínculo de conta.

    Use ``Serializer(instancia).data`` (com o nome desta classe) para representar a saída;
    ``many=True`` representa uma coleção.

    Campos declarados: ``login``, ``status``.
    """

    login = serializers.CharField()
    status = serializers.CharField()


class LinkGameAccountSerializer(serializers.Serializer):
    """Valida login e senha usados para comprovar acesso antes de vincular uma conta Lineage.

    Instancie com ``data=payload`` e chame ``is_valid(raise_exception=True)`` antes de consumir
    validated_data. A autorização pertence ao fluxo chamador.

    Campos declarados: ``login``, ``password``.
    """

    login = serializers.CharField(max_length=45)
    password = serializers.CharField(write_only=True)


class UnlinkGameAccountSerializer(serializers.Serializer):
    """Valida o login da conta que o usuário deseja desvincular.

    Instancie com ``data=payload`` e chame ``is_valid(raise_exception=True)`` antes de consumir
    validated_data. A autorização pertence ao fluxo chamador.

    Campos declarados: ``login``.
    """

    login = serializers.CharField(max_length=45)


class UpdateGamePasswordSerializer(serializers.Serializer):
    """Valida a nova senha e a identificação da conta Lineage.

    Instancie com ``data=payload`` e chame ``is_valid(raise_exception=True)`` antes de consumir
    validated_data. A autorização pertence ao fluxo chamador.

    Campos declarados: ``login``, ``password``.
    """

    login = serializers.CharField(required=False, allow_blank=True)
    password = serializers.CharField(min_length=6, write_only=True)


class ChangeNicknameSerializer(serializers.Serializer):
    """Valida os dados de solicitação de mudança de nome de personagem.

    Instancie com ``data=payload`` e chame ``is_valid(raise_exception=True)`` antes de consumir
    validated_data. A autorização pertence ao fluxo chamador.

    Campos declarados: ``login``, ``char_id``, ``name``.
    """

    login = serializers.CharField()
    char_id = serializers.IntegerField()
    name = serializers.CharField(max_length=16)
    request_key = serializers.UUIDField(required=False)


class ChangeSexSerializer(serializers.Serializer):
    """Valida os dados de solicitação de mudança de sexo de personagem.

    Instancie com ``data=payload`` e chame ``is_valid(raise_exception=True)`` antes de consumir
    validated_data. A autorização pertence ao fluxo chamador.

    Campos declarados: ``login``, ``char_id``, ``sex``.
    """

    login = serializers.CharField()
    char_id = serializers.IntegerField()
    sex = serializers.ChoiceField(choices=["M", "F"])
    request_key = serializers.UUIDField(required=False)


class UnstuckSerializer(serializers.Serializer):
    """Valida a identificação do personagem para o serviço de reposicionamento.

    Instancie com ``data=payload`` e chame ``is_valid(raise_exception=True)`` antes de consumir
    validated_data. A autorização pertence ao fluxo chamador.

    Campos declarados: ``login``, ``char_id``.
    """

    login = serializers.CharField()
    char_id = serializers.IntegerField()


class PurchaseSlotSerializer(serializers.Serializer):
    """Valida a quantidade de slots adicionais de vínculo a comprar.

    Instancie com ``data=payload`` e chame ``is_valid(raise_exception=True)`` antes de consumir
    validated_data. A autorização pertence ao fluxo chamador.

    Campos declarados: ``quantity``.
    """

    quantity = serializers.IntegerField(min_value=1, max_value=10)
