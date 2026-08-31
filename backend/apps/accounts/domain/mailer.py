from __future__ import annotations

from abc import ABC, abstractmethod


class IMailer(ABC):
    @abstractmethod
    def send(self, to: str, subject: str, body: str) -> None:
        raise NotImplementedError
