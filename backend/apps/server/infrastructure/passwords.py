from __future__ import annotations

import base64
import hashlib

from django.conf import settings

from apps.server.infrastructure.crypto.whirlpool2003 import Whirlpool2003

SHA1_LENGTH = 28
WHIRLPOOL_LENGTH = 88
WHIRLPOOL_DIALECTS = frozenset({"lucerav2", "lucera"})


class LineagePasswordHasher:
    """
    Hash das contas L2.

    Lucera grava Whirlpool-2003 em Base64 (88 chars). L2J/Dream usam SHA1 (28 chars).
    Na verificação, o algoritmo é escolhido pelo tamanho do hash já salvo no banco.
    """

    def hash(self, password: str) -> str:
        dialect = str(getattr(settings, "LINEAGE_QUERY_MODULE", "")).lower()
        if dialect in WHIRLPOOL_DIALECTS:
            return self._whirlpool(password)
        return self._sha1(password)

    def verify(self, password: str, stored: str) -> bool:
        if not stored:
            return False
        hashed = self._hash_for_stored(password, stored)
        if hashed is None:
            return False
        return hashed.lower() == stored.lower()

    def _hash_for_stored(self, password: str, stored: str) -> str | None:
        length = len(stored.strip())
        if length == SHA1_LENGTH:
            return self._sha1(password)
        if length == WHIRLPOOL_LENGTH:
            return self._whirlpool(password)
        return None

    def _sha1(self, password: str) -> str:
        return base64.b64encode(hashlib.sha1(password.encode()).digest()).decode()

    def _whirlpool(self, password: str) -> str:
        whirlpool = Whirlpool2003()
        whirlpool.update(password.encode())
        return base64.b64encode(whirlpool.digest()).decode()
