"""Wrap model/AppConfig verbose_name strings with gettext_lazy (one-shot migrate)."""

from __future__ import annotations

import ast
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IMPORT = "from django.utils.translation import gettext_lazy as _\n"

# Keys whose string values should be wrapped.
WRAP_KEYS = {
    "verbose_name",
    "verbose_name_plural",
    "help_text",
}


class Transform(ast.NodeTransformer):
    def visit_keyword(self, node: ast.keyword) -> ast.AST:
        self.generic_visit(node)
        if node.arg in WRAP_KEYS and isinstance(node.value, ast.Constant) and isinstance(node.value.value, str):
            node.value = ast.Call(
                func=ast.Name(id="_", ctx=ast.Load()),
                args=[ast.Constant(value=node.value.value)],
                keywords=[],
            )
        return node

    def visit_Assign(self, node: ast.Assign) -> ast.AST:
        self.generic_visit(node)
        if len(node.targets) == 1 and isinstance(node.targets[0], ast.Name):
            name = node.targets[0].id
            if name in WRAP_KEYS and isinstance(node.value, ast.Constant) and isinstance(node.value.value, str):
                node.value = ast.Call(
                    func=ast.Name(id="_", ctx=ast.Load()),
                    args=[ast.Constant(value=node.value.value)],
                    keywords=[],
                )
        return node


def ensure_import(source: str) -> str:
    if "gettext_lazy as _" in source:
        return source
    # After future import / module docstring / other imports
    lines = source.splitlines(keepends=True)
    insert_at = 0
    for i, line in enumerate(lines):
        if line.startswith("from __future__"):
            insert_at = i + 1
            continue
        if line.startswith(("import ", "from ")):
            insert_at = i + 1
            continue
        if insert_at and line.strip() == "":
            insert_at = i + 1
            continue
        if insert_at and not line.startswith(("import ", "from ", "#")):
            break
    # Prefer after last django import if any
    last_django = None
    for i, line in enumerate(lines):
        if "django" in line and line.startswith(("import ", "from ")):
            last_django = i
    if last_django is not None:
        insert_at = last_django + 1
    lines.insert(insert_at, IMPORT if lines[insert_at - 1].endswith("\n") or insert_at == 0 else "\n" + IMPORT)
    if insert_at > 0 and not lines[insert_at - 1].endswith("\n"):
        lines[insert_at - 1] += "\n"
    return "".join(lines)


def transform_file(path: Path) -> bool:
    original = path.read_text(encoding="utf-8")
    if "verbose_name" not in original and "help_text" not in original:
        return False
    try:
        tree = ast.parse(original)
    except SyntaxError:
        print("SKIP syntax", path)
        return False
    new_tree = Transform().visit(tree)
    ast.fix_missing_locations(new_tree)
    try:
        transformed = ast.unparse(new_tree)
    except Exception as exc:
        print("SKIP unparse", path, exc)
        return False
    # ast.unparse drops encoding/comments — only use if we detect wraps needed
    if "_(" not in transformed and "gettext_lazy" not in original:
        # Check if any wraps were applied by comparing Constant vs Call for verbose_name
        pass
    # Safer: regex approach for assignments and keywords only
    return transform_file_regex(path, original)


def transform_file_regex(path: Path, original: str | None = None) -> bool:
    source = original if original is not None else path.read_text(encoding="utf-8")
    updated = source

    def wrap_match(match: re.Match[str]) -> str:
        key, quote, value = match.group(1), match.group(2), match.group(3)
        # already wrapped
        if match.group(0).startswith(f"{key}=_(") or match.group(0).startswith(f"{key} = _("):
            return match.group(0)
        return f"{key}={quote}{value}{quote}" if False else f"{key}=_({quote}{value}{quote})"

    # keyword style: verbose_name="..." or verbose_name='...'
    pattern = re.compile(
        r"\b(verbose_name_plural|verbose_name|help_text)\s*=\s*(['\"])(.*?)\2",
        re.DOTALL,
    )

    def replacer(match: re.Match[str]) -> str:
        key, quote, value = match.group(1), match.group(2), match.group(3)
        full = match.group(0)
        # skip if already _(...)
        prefix = source[max(0, match.start() - 2) : match.start()]
        # look behind for _(
        start = match.start()
        before = source[max(0, start - 3) : start]
        # Check left side assignment already has _(
        left = source[max(0, match.start() - 5) : match.start()]
        # If pattern is name=_("x") the = is followed by _(
        after_eq = source[match.start() : match.end()]
        if re.match(rf"{key}\s*=\s*_\(", after_eq):
            return full
        # Avoid wrapping if value already looks like _(
        if value.startswith("_("):
            return full
        return f"{key}=_({quote}{value}{quote})"

    # Only wrap if not already wrapped: negative lookbehind for _(
    pattern2 = re.compile(
        r"(?<!_\()\b(verbose_name_plural|verbose_name|help_text)\s*=\s*(['\"])((?:\\.|)*?)\2"
    )
    # Simpler line-oriented for non-multiline
    pattern3 = re.compile(
        r"(?<!_\()\b(verbose_name_plural|verbose_name|help_text)\s*=\s*(\"([^\"]*)\"|'([^']*)')"
    )

    def replacer3(match: re.Match[str]) -> str:
        key = match.group(1)
        lit = match.group(2)
        return f"{key}=_({lit})"

    new_source, count = pattern3.subn(replacer3, source)
    # Fix double wrap
    new_source = re.sub(
        r"\b(verbose_name_plural|verbose_name|help_text)=_\(_\((\"[^\"]*\"|'[^']*')\)\)",
        r"\1=_(\2)",
        new_source,
    )
    if new_source == source:
        return False
    new_source = ensure_import(new_source)
    # Deduplicate import
    parts = new_source.split(IMPORT)
    if len(parts) > 2:
        new_source = parts[0] + IMPORT + "".join(parts[1:]).replace(IMPORT, "")
    path.write_text(new_source, encoding="utf-8")
    print(f"OK {path.relative_to(ROOT)} ({count})")
    return True


def main() -> None:
    targets: list[Path] = []
    for pattern in (
        "apps/**/infrastructure/models*.py",
        "apps/**/models.py",
        "apps/**/apps.py",
        "common/models.py",
        "common/apps.py",
    ):
        targets.extend(ROOT.glob(pattern))
    seen = set()
    changed = 0
    for path in sorted(targets):
        if path in seen:
            continue
        seen.add(path)
        if transform_file_regex(path):
            changed += 1
    print(f"Changed {changed} files")


if __name__ == "__main__":
    main()
