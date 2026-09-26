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
        from_email = (
            str(getattr(settings, "DEFAULT_FROM_EMAIL", "") or "").strip()
            or str(getattr(settings, "EMAIL_HOST_USER", "") or "").strip()
            or "noreply@localhost"
        )
        if from_email == "noreply@localhost" and getattr(settings, "EMAIL_HOST_USER", ""):
            from_email = str(settings.EMAIL_HOST_USER).strip()

        try:
            send_mail(subject, body, from_email, [to], fail_silently=False)
        except Exception:
            logger.exception(
                "Falha ao enviar e-mail via DjangoMailer",
                extra={
                    "event": "email.send_failed",
                    "recipient": to,
                    "subject": subject,
                    "from_email": from_email,
                },
            )
