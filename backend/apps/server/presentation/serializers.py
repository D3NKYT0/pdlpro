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
