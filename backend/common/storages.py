"""Armazenamento de arquivos que nunca podem ser publicados como conteúdo estático."""

from __future__ import annotations

import os

from django.conf import settings
from django.core.files.storage import FileSystemStorage


class PrivateFileSystemStorage(FileSystemStorage):
    """Grava em ``PRIVATE_MEDIA_ROOT``, fora da árvore que o Nginx serve em ``/media/``.

    Use em campos cujo download precisa passar por uma view que confere autorização (ex.: o
    pacote de portabilidade LGPD). ``url()`` levanta ``ValueError`` para que nenhum serializer
    ou widget publique o caminho por engano; entregue o arquivo com ``open()`` na view. O
    diretório é lido das settings a cada acesso, então ``PRIVATE_MEDIA_ROOT`` pode ser
    substituído por teste sem recriar a instância.
    """

    @property
    def base_location(self):
        return self._value_or_setting(self._location, settings.PRIVATE_MEDIA_ROOT)

    @property
    def location(self):
        return os.path.abspath(self.base_location)

    def url(self, name):
        raise ValueError(
            "Arquivo privado: entregue por view autorizada, não por URL pública."
        )


private_media_storage = PrivateFileSystemStorage(
    file_permissions_mode=0o600,
    directory_permissions_mode=0o700,
)
