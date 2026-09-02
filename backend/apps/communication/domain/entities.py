from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID


@dataclass(frozen=True, slots=True)
class NotificationEntity:
    """Notificação persistida de um usuário, incluindo conteúdo e estado de leitura.

    É um objeto de dados; não carrega métodos de persistência do ORM. Consulte os campos tipados
    abaixo ao montar ou consumir o resultado.
    """

    id: UUID
    title: str
    body: str
    kind: str
    link: str
    is_read: bool
    created_at: str
