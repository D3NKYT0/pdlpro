"""Wrap extend_schema summary=/description= string literals with gettext_lazy.

Usage (from backend/):
  .\\.venv\\Scripts\\python.exe scripts\\wrap_openapi_gettext.py
"""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IMPORT_LINE = "from django.utils.translation import gettext_lazy as _lazy"

# Match summary/description = "..." or '...' (single line) or """...""" / '''...'''
KWARG_RE = re.compile(
    r"""(?P<prefix>\b(?P<key>summary|description)\s*=\s*)"""
    r"""(?P<quote>\"\"\"|'''|\"|')(?P<body>.*?)(?P=quote)""",
    re.DOTALL,
)

SKIP_DIRS = {".venv", "migrations", "__pycache__", "locale", "scripts"}


def should_wrap(body: str, full: str) -> bool:
    stripped = body.strip()
    if not stripped:
        return False
    # already wrapped
    return not (
        full.lstrip().startswith("_lazy(")
        or full.lstrip().startswith("_(")
        or full.lstrip().startswith("gettext_lazy(")
    )


def ensure_import(source: str) -> str:
    if "gettext_lazy as _lazy" in source or "import gettext_lazy" in source:
        return source
    # Prefer after other django.utils.translation imports
    m = re.search(
        r"^from django\.utils\.translation import .+$",
        source,
        flags=re.MULTILINE,
    )
    if m:
        insert_at = m.end()
        return source[:insert_at] + "\n" + IMPORT_LINE + source[insert_at:]
    # after first django import block
    m = re.search(r"^(?:from django|import django).+$", source, flags=re.MULTILINE)
    if m:
        insert_at = m.end()
        return source[:insert_at] + "\n" + IMPORT_LINE + source[insert_at:]
    # after module docstring / future
    m = re.search(r'^("""[\s\S]*?"""|\'\'\'[\s\S]*?\'\'\')\s*', source)
    if m:
        return source[: m.end()] + IMPORT_LINE + "\n" + source[m.end() :]
    return IMPORT_LINE + "\n" + source


def transform(source: str) -> tuple[str, int]:
    count = 0

    def repl(match: re.Match[str]) -> str:
        nonlocal count
        quote = match.group("quote")
        body = match.group("body")
        prefix = match.group("prefix")
        # skip if already _lazy( immediately before — check preceding chars
        start = match.start()
        lookbehind = source[max(0, start - 16) : start]
        if (
            "_lazy(" in lookbehind
            or "gettext_lazy(" in lookbehind
            or re.search(r"_\(\s*$", lookbehind)
        ):
            return match.group(0)
        if not should_wrap(body, match.group(0)):
            return match.group(0)
        count += 1
        return f"{prefix}_lazy({quote}{body}{quote})"

    new_source = KWARG_RE.sub(repl, source)
    if count:
        new_source = ensure_import(new_source)
    return new_source, count


def iter_targets() -> list[Path]:
    targets: list[Path] = []
    for path in ROOT.rglob("*.py"):
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        text = path.read_text(encoding="utf-8")
        if "extend_schema" not in text and path.name != "swagger.py":
            continue
        if "summary=" in text or "description=" in text or path.name == "swagger.py":
            targets.append(path)
    return targets


def transform_swagger(path: Path) -> int:
    """Wrap OPENAPI_DESCRIPTION and tag description strings."""
    source = path.read_text(encoding="utf-8")
    original = source
    if "gettext_lazy" not in source:
        source = IMPORT_LINE + "\n\n" + source

    # OPENAPI_DESCRIPTION = """..."""
    source, n1 = re.subn(
        r'^(OPENAPI_DESCRIPTION\s*=\s*)("""[\s\S]*?""")',
        lambda m: f"{m.group(1)}_lazy({m.group(2)})"
        if "_lazy(" not in m.group(0)
        else m.group(0),
        source,
        count=1,
        flags=re.MULTILINE,
    )

    # tag dict "description": "..." or ("..." "...")
    count = n1

    def tag_repl(m: re.Match[str]) -> str:
        nonlocal count
        if "_lazy(" in m.group(0):
            return m.group(0)
        count += 1
        return f'{m.group(1)}_lazy({m.group(2)})'

    source = re.sub(
        r'("description"\s*:\s*)((?:"""[\s\S]*?"""|\'\'\'[\s\S]*?\'\'\'|"(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])*\'|\([\s\S]*?\)))',
        tag_repl,
        source,
    )

    if source != original:
        path.write_text(source, encoding="utf-8")
    return count if source != original else 0


def main() -> None:
    total_files = 0
    total_wraps = 0
    for path in iter_targets():
        if path.name == "swagger.py":
            n = transform_swagger(path)
            if n:
                total_files += 1
                total_wraps += n
                print(f"OK {path.relative_to(ROOT)} ({n})")
            continue
        source = path.read_text(encoding="utf-8")
        new_source, count = transform(source)
        if count:
            path.write_text(new_source, encoding="utf-8")
            total_files += 1
            total_wraps += count
            print(f"OK {path.relative_to(ROOT)} ({count})")
    print(f"files={total_files} wraps={total_wraps}")


if __name__ == "__main__":
    main()
