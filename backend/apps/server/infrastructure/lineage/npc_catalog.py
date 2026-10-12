import logging
from functools import cached_property, lru_cache
from pathlib import Path
from xml.etree import ElementTree

from django.conf import settings

from apps.server.domain.bosses import INpcCatalog

logger = logging.getLogger(__name__)


@lru_cache(maxsize=2)
def _load_catalog(files: tuple[tuple[str, int, int], ...]) -> dict[int, dict]:
    """Reindexa quando arquivos são adicionados, removidos ou modificados."""
    result = {}
    for filename, _, _ in files:
        try:
            for _, npc in ElementTree.iterparse(filename, events=("end",)):
                if npc.tag != "npc":
                    continue
                try:
                    npc_id = int(npc.get("id", "0"))
                    name = (npc.get("name") or "").strip()
                    level = next((row.get("value", row.get("val")) for row in npc.findall("set")
                                  if row.get("name") == "level"), npc.get("level"))
                    if npc_id > 0 and name:
                        result[npc_id] = {"name": name, "level": int(level) if level else None}
                except (TypeError, ValueError):
                    logger.warning("NPC inválido no acervo: %s", filename)
                npc.clear()
        except (OSError, ElementTree.ParseError):
            logger.warning("Não foi possível ler o acervo de NPCs: %s", filename)
    return result


class XmlNpcCatalog(INpcCatalog):
    """Nomes/níveis do LINEAGE_NPC_XML_DIR; XML ausente não interrompe o ranking."""

    def __init__(self, root: Path | None = None):
        self._root = Path(root or getattr(settings, "LINEAGE_NPC_XML_DIR", settings.BASE_DIR / "data" / "npc"))

    @cached_property
    def _rows(self) -> dict[int, dict]:
        files = []
        for path in sorted(self._root.glob("*.xml")):
            try:
                stat = path.stat()
                files.append((str(path), stat.st_mtime_ns, stat.st_size))
            except OSError:
                continue
        return _load_catalog(tuple(files))

    def get(self, npc_id: int) -> dict | None:
        row = self._rows.get(npc_id)
        return dict(row) if row else None
