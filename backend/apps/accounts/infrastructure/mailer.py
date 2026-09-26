import logging

from django.conf import settings
from django.core.mail import send_mail

from apps.accounts.domain.mailer import IMailer

logger = logging.getLogger(__name__)


class DjangoMailer(IMailer):
    """Adaptador de IMailer para o backend de e-mail configurado no Django.

    Injete IMailer nos casos de uso e forneça destinatário, assunto e corpo em ``send``. O
    backend e o remetente vêm das configurações de e-mail do projeto.
    """

    def send(self, to: str, subject: str, body: str) -> None:
        try:
            send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [to], fail_silently=False)
        except Exception:
            logger.exception(
                "Falha ao enviar e-mail via DjangoMailer",
                extra={
                    "event": "email.send_failed",
                    "recipient": to,
                    "subject": subject,
                },
            )
