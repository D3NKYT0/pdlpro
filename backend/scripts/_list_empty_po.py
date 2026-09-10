"""Report msgids that still have an empty msgstr in the en/es catalogs.

Writes ``scripts/_openapi_empty.json`` only while something is still missing, so a
finished run never clobbers the working list with ``[]``.

Usage (from ``backend/``)::

    .\\.venv\\Scripts\\python.exe scripts\\_list_empty_po.py
"""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SNAPSHOT = Path(__file__).with_name("_openapi_empty.json")


def parse_po_string(body: str) -> str:
    parts = re.findall(r'"(.*?)"', body, flags=re.DOTALL)
    out = []
    for p in parts:
        out.append(
            p.replace(r"\\", "\\")
            .replace(r"\n", "\n")
            .replace(r"\t", "\t")
            .replace(r"\"", '"')
        )
    return "".join(out)


def empty_msgids(path: Path) -> list[str]:
    text = path.read_text(encoding="utf-8")
    empties: list[str] = []
    for part in re.split(r"\n\n+", text):
        if "msgid " not in part or "msgstr " not in part:
            continue
        mid_m = re.search(r"^msgid (?P<body>(?:\"\"\n(?:\".*\"\n)+|\".*\"))", part, re.MULTILINE)
        ms_m = re.search(r"^msgstr (?P<body>(?:\"\"\n(?:\".*\"\n)+|\".*\"))", part, re.MULTILINE)
        if not mid_m or not ms_m:
            continue
        msgid = parse_po_string(mid_m.group("body"))
        msgstr = parse_po_string(ms_m.group("body"))
        if msgid and not msgstr:
            empties.append(msgid)
    return empties


def main() -> None:
    total = 0
    for lang in ("en", "es"):
        empties = empty_msgids(ROOT / f"locale/{lang}/LC_MESSAGES/django.po")
        total += len(empties)
        print(f"{lang}: empty {len(empties)}")
        for entry in empties[:15]:
            print("  -", entry[:100].replace("\n", " "))
        if lang == "en" and empties:
            SNAPSHOT.write_text(
                json.dumps(empties, ensure_ascii=False, indent=2), encoding="utf-8"
            )
    print(f"total empty {total}")


if __name__ == "__main__":
    main()
