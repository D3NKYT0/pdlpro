"""Porta de persistência para delegação auditável de papéis, sem dependência do ORM."""

from abc import ABC, abstractmethod


class IAccessManagementStore(ABC):
    """Consulta e altera apenas papel principal, papéis adicionais e entrada no admin."""

    @abstractmethod
    def get(self, user_id):
        """Retorna estado, concessões adicionais e revisão para controle de concorrência."""

    @abstractmethod
    def update(self, actor_id, user_id, role, additional_roles, is_staff, revision):
        """Atualiza atomicamente e registra antes/depois, preservando concessões externas."""

    @abstractmethod
    def catalog(self):
        """Templates efetivos, incluindo concessões explícitas nos grupos reservados."""

