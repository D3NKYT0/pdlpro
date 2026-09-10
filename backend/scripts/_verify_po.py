"""Verificação rápida dos catálogos: vazios, msgstr idêntico ao msgid e amostras."""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

BLOCK = re.compile(r'^(msgid|msgstr) ((?:""\n)?(?:".*"\n?)+)', re.MULTILINE)


def join(body: str) -> str:
    parts = re.findall(r'"(.*)"', body)
    out = []
    for p in parts:
        out.append(
            p.replace("\\n", "\n").replace("\\t", "\t").replace('\\"', '"').replace("\\\\", "\\")
        )
    return "".join(out)


def parse(path: Path) -> dict[str, str]:
    text = path.read_text(encoding="utf-8")
    catalog: dict[str, str] = {}
    for chunk in re.split(r"\n\n+", text):
        if chunk.lstrip().startswith("#~"):
            continue
        found = {}
        for kind, body in BLOCK.findall(chunk):
            found.setdefault(kind, body)
        if "msgid" in found and "msgstr" in found:
            catalog[join(found["msgid"])] = join(found["msgstr"])
    return catalog


SAMPLES = [
    "Obter token CSRF",
    "Sair",
    "Interfaces Swagger UI e ReDoc desta documentação OpenAPI.",
    "Pesquise as permissões disponíveis e use as setas para atribuir ou remover.",
]


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    for lang in ("en", "es"):
        catalog = parse(ROOT / f"locale/{lang}/LC_MESSAGES/django.po")
        empty = [k for k, v in catalog.items() if k and not v]
        identical = [k for k, v in catalog.items() if k and v and k == v]
        print(f"{lang}: entries={len(catalog)} empty={len(empty)} identical={len(identical)}")
        for msgid in SAMPLES:
            print(f"   {msgid[:45]!r} -> {catalog.get(msgid)!r}")
        for msgid in empty[:10]:
            print(f"   EMPTY {msgid[:80]!r}")


if __name__ == "__main__":
    main()
