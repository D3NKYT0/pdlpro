from __future__ import annotations

from abc import ABC, abstractmethod


class IMailer(ABC):
    """Porta de envio de e-mail para os fluxos de conta da aplicação.

    Implemente ``send`` em um adaptador de infraestrutura e injete IMailer nos casos de uso. Em
    testes, substitua por um fake que registre as mensagens sem realizar entrega externa.
    """

    @abstractmethod
    def send(self, to: str, subject: str, body: str) -> None:
        raise NotImplementedError
