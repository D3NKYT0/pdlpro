from dataclasses import asdict

from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.communication.application.use_cases import (
    ListNotificationsInput,
    ListNotificationsUseCase,
    MarkNotificationReadInput,
    MarkNotificationReadUseCase,
)
from common.views import InjectedAPIView


class NotificationListView(InjectedAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Notificações"])
    def get(self, request):
        payload = self.resolve(ListNotificationsUseCase).execute(ListNotificationsInput(user_id=request.user.id))
        results = []
        for row in payload["results"]:
            item = asdict(row)
            item["id"] = str(item["id"])
            results.append(item)
        return Response({"unread": payload["unread"], "results": results})


class MarkAllNotificationsReadView(InjectedAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Notificações"])
    def post(self, request):
        return Response(
            self.resolve(MarkNotificationReadUseCase).execute(
                MarkNotificationReadInput(user_id=request.user.id)
            )
        )


class MarkNotificationReadView(InjectedAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Notificações"])
    def post(self, request, notification_id):
        return Response(
            self.resolve(MarkNotificationReadUseCase).execute(
                MarkNotificationReadInput(user_id=request.user.id, notification_id=notification_id)
            )
        )
