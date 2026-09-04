"""Inicia o runtime local já instalado; não baixa modelos durante o boot do PDL."""

import os
import shutil
import subprocess
import time
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from httpx import HTTPError
from ollama import Client, ResponseError


class Command(BaseCommand):
    """Reutiliza Ollama disponível ou inicia um processo sem janela e sem nuvem."""

    help = "Prepara o Ollama local para a conversa do Denkynho."

    def handle(self, *args, **options):
        if not settings.DENKYNHO_LLM_ENABLED:
            self.stdout.write("Denkynho: ajuda básica (modelo local desabilitado).")
            return
        if settings.DENKYNHO_OLLAMA_URL != "http://127.0.0.1:11434":
            raise CommandError("Boot automático requer http://127.0.0.1:11434; inicie outros endpoints localmente.")
        client = Client(host=settings.DENKYNHO_OLLAMA_URL, timeout=2, trust_env=False, follow_redirects=False)
        try:
            client.list()
        except (HTTPError, OSError, ResponseError):
            executable = shutil.which("ollama")
            if not executable:
                candidate = Path(os.environ.get("LOCALAPPDATA", "")) / "PDL" / "ollama" / "ollama.exe"
                executable = str(candidate) if candidate.is_file() else None
            if not executable:
                raise CommandError("Instale Ollama conforme docs/funcionalidades/ajuda.md.") from None
            subprocess.Popen(
                [executable, "serve"], stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL, env={**os.environ, "OLLAMA_HOST": "127.0.0.1:11434", "OLLAMA_NO_CLOUD": "1"},
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
            )
            for _ in range(20):
                try:
                    client.list()
                    break
                except (HTTPError, OSError, ResponseError):
                    time.sleep(0.5)
            else:
                raise CommandError("Ollama não iniciou. Confira a porta 11434.") from None
        self.stdout.write(f"Denkynho: Ollama pronto. Modelo configurado: {settings.DENKYNHO_LLM_MODEL}.")
