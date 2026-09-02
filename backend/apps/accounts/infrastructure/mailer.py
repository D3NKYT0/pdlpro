from __future__ import annotations

from django.conf import settings
from django.core.mail import send_mail

from apps.accounts.domain.mailer import IMailer


class DjangoMailer(IMailer):
    """Adaptador de IMailer para o backend de e-mail configurado no Django.

    Injete IMailer nos casos de uso e forneça destinatário, assunto e corpo em ``send``. O
    backend e o remetente vêm das configurações de e-mail do projeto.
    """

    def send(self, to: str, subject: str, body: str) -> None:
        send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [to], fail_silently=True)
