from rest_framework import serializers


class CreatePostSerializer(serializers.Serializer):
    body = serializers.CharField(min_length=1, max_length=2000)
