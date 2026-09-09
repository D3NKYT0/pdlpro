from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from apps.programs.domain.preview_seed import IPreviewSeedService
from common.di.bootstrap import DependencyInjection


class Command(BaseCommand):
    """Comando Django ``seed_program_preview``.

    Cria dados fictícios apenas em core.settings.preview. Execute ``python manage.py
    seed_program_preview --help`` para consultar opções antes de rodar a rotina no ambiente
    desejado.
    """

    help = "Cria dados fictícios apenas em core.settings.preview."

    def add_arguments(self, parser):
        parser.add_argument("--password", required=True)

    def handle(self, *args, **options):
        if not getattr(settings, "PDL_QA_PREVIEW", False):
            raise CommandError(
                "Use --settings=core.settings.preview; o banco normal não é permitido."
            )
        scope = DependencyInjection.root().create_scope()
        scope.resolve(IPreviewSeedService).seed(options["password"])
        self.stdout.write(
            self.style.SUCCESS(
                "Dados fictícios criados no banco isolado. Usuário: preview."
            )
        )
