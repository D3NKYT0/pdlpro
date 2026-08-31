from __future__ import annotations

from django.conf import settings
from django.core.mail import send_mail

from apps.accounts.domain.mailer import IMailer


class DjangoMailer(IMailer):
    def send(self, to: str, subject: str, body: str) -> None:
        send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [to], fail_silently=True)
