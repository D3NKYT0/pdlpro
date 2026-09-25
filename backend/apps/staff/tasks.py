"""Tarefas Celery de manutenção automática de segredos."""

from __future__ import annotations

from celery import shared_task

from apps.staff.application.secrets import (
    AutoSecretMaintenanceInput,
    AutoSecretMaintenanceUseCase,
)
from common.di.bootstrap import DependencyInjection


@shared_task(name="apps.staff.tasks.run_secret_maintenance")
def run_secret_maintenance():
    """Prune de fallbacks expirados e rotação automática da SECRET_KEY quando configurada."""

    scope = DependencyInjection.root().create_scope()
    return scope.resolve(AutoSecretMaintenanceUseCase).execute(
        AutoSecretMaintenanceInput(source="beat")
    )
