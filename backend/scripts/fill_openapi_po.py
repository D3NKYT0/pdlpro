"""Fill the English and Spanish catalogs with the OpenAPI documentation strings.

The ``drf-spectacular`` summaries, descriptions and tag blurbs are wrapped in
``gettext`` at the presentation layer, so every Portuguese msgid extracted from
``common/swagger.py`` and the view decorators needs an ``en``/``es`` msgstr.

Translations live in ``scripts/openapi_translations.json`` as
``{msgid: [en, es]}`` — the data file is the single source of truth, so adding a
string means editing JSON, never this rewriter.

The rewriter is block based: it understands both the single-line
(``msgid "x"``/``msgstr "y"``) and the wrapped multiline PO layouts, force
overwrites a msgstr that is empty *or* wrong, and drops the ``#| msgid`` /
``#, fuzzy`` leftovers ``msgmerge`` produces for look-alike entries.

Usage (from ``backend/``)::

    .\\.venv\\Scripts\\python.exe scripts\\fill_openapi_po.py
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TRANSLATIONS_PATH = Path(__file__).with_name("openapi_translations.json")

LANGUAGES = (("en", 0), ("es", 1))

_ESCAPES = (
    ("\\", "\\\\"),
    ('"', '\\"'),
    ("\t", "\\t"),
    ("\r", "\\r"),
)
_UNESCAPES = {
    "\\\\": "\\",
    '\\"': '"',
    "\\n": "\n",
    "\\t": "\t",
    "\\r": "\r",
}


def load_translations() -> dict[str, list[str]]:
    """Read the JSON data file, rejecting entries that are not ``[en, es]``."""
    raw = json.loads(TRANSLATIONS_PATH.read_text(encoding="utf-8"))
    for msgid, pair in raw.items():
        if not isinstance(pair, list) or len(pair) != 2 or not all(pair):
            raise SystemExit(f"invalid [en, es] pair for msgid {msgid[:60]!r}")
    return raw


def po_unescape(literal: str) -> str:
    """Decode the body of a single PO string literal (without the quotes)."""
    out: list[str] = []
    index = 0
    while index < len(literal):
        char = literal[index]
        if char == "\\" and index + 1 < len(literal):
            pair = literal[index : index + 2]
            out.append(_UNESCAPES.get(pair, pair[1]))
            index += 2
            continue
        out.append(char)
        index += 1
    return "".join(out)


def po_escape(value: str) -> str:
    for raw, encoded in _ESCAPES:
        value = value.replace(raw, encoded)
    return value.replace("\n", "\\n")


def read_literals(lines: list[str], start: int, keyword: str) -> tuple[str, int]:
    """Read ``keyword`` plus its continuation literals; return value and end index."""
    first = lines[start][len(keyword) + 1 :].strip()
    chunks = [po_unescape(first[1:-1])]
    index = start + 1
    while index < len(lines) and lines[index].startswith('"'):
        chunks.append(po_unescape(lines[index].strip()[1:-1]))
        index += 1
    return "".join(chunks), index


def format_msgstr(value: str) -> list[str]:
    """Render a msgstr, using the multiline layout when the value has newlines."""
    if "\n" not in value:
        return [f'msgstr "{po_escape(value)}"']
    parts = value.split("\n")
    segments = [f"{part}\n" for part in parts[:-1]]
    if parts[-1]:
        segments.append(parts[-1])
    return ['msgstr ""'] + [f'"{po_escape(segment)}"' for segment in segments]


def rewrite_block(
    block: str, lang_index: int, translations: dict[str, list[str]]
) -> tuple[str, bool]:
    lines = block.split("\n")
    msgid_at = next(
        (i for i, line in enumerate(lines) if line.startswith("msgid ")),
        None,
    )
    if msgid_at is None or any(line.startswith("msgid_plural") for line in lines):
        return block, False

    msgid, after_msgid = read_literals(lines, msgid_at, "msgid")
    if msgid not in translations:
        return block, False
    if after_msgid >= len(lines) or not lines[after_msgid].startswith("msgstr "):
        return block, False

    current, after_msgstr = read_literals(lines, after_msgid, "msgstr")
    target = translations[msgid][lang_index]

    header = [
        line
        for line in lines[:msgid_at]
        if not line.startswith("#|") and line.strip() != "#, fuzzy"
    ]
    rebuilt = "\n".join(
        header
        + lines[msgid_at:after_msgid]
        + format_msgstr(target)
        + lines[after_msgstr:]
    )
    return rebuilt, (current != target or rebuilt != block)


def apply(
    path: Path, lang_index: int, translations: dict[str, list[str]]
) -> tuple[int, int, set[str]]:
    """Rewrite ``path`` in place; return updates, stripped refs and matched msgids."""
    text = path.read_text(encoding="utf-8")
    blocks = text.split("\n\n")
    updated = 0
    matched: set[str] = set()
    for position, block in enumerate(blocks):
        lines = block.split("\n")
        msgid_at = next(
            (i for i, line in enumerate(lines) if line.startswith("msgid ")),
            None,
        )
        if msgid_at is not None:
            msgid, _ = read_literals(lines, msgid_at, "msgid")
            if msgid in translations:
                matched.add(msgid)
        rebuilt, changed = rewrite_block(block, lang_index, translations)
        if changed:
            updated += 1
            blocks[position] = rebuilt
    new_text = "\n\n".join(blocks)

    stripped = len(re.findall(r"^#\| msgid .*\n", new_text, flags=re.MULTILINE))
    new_text = re.sub(r"^#\| .*\n", "", new_text, flags=re.MULTILINE)
    new_text = re.sub(r"^#, fuzzy\n", "", new_text, flags=re.MULTILINE)
    new_text = re.sub(r"^#, fuzzy, ", "#, ", new_text, flags=re.MULTILINE)

    path.write_text(new_text, encoding="utf-8")
    return updated, stripped, matched


def main() -> None:
    translations = load_translations()
    print(f"translations={len(translations)}")
    for lang, index in LANGUAGES:
        updated, stripped, matched = apply(
            ROOT / f"locale/{lang}/LC_MESSAGES/django.po", index, translations
        )
        unmatched = len(translations) - len(matched)
        print(
            f"{lang}: updated={updated} stripped_fuzzy_refs={stripped} "
            f"unmatched_msgids={unmatched}"
        )


if __name__ == "__main__":
    main()
