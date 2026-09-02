"""Lista candidatos a duplicação para revisão humana, sem alterar o código.

Backend: corpos AST idênticos, ignorando docstrings e construtores de DI.
Frontend: janelas de linhas idênticas após normalização de espaços.
Não prova equivalência semântica nem exige abstrair contratos de domínios distintos.
Uso: python scripts/audit_reuse.py [--json caminho.json] [--limit 25]
"""

import argparse
import ast
from collections import defaultdict
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def backend_candidates():
    groups = defaultdict(list)
    for folder in [ROOT / "backend/apps", ROOT / "backend/common"]:
        for file in folder.rglob("*.py"):
            if {"tests", "migrations", "__pycache__"}.intersection(file.parts):
                continue
            tree = ast.parse(file.read_text(encoding="utf-8-sig"))
            for node in ast.walk(tree):
                if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) or node.name == "__init__":
                    continue
                body = list(node.body)
                if body and isinstance(body[0], ast.Expr) and isinstance(body[0].value, ast.Constant) and isinstance(body[0].value.value, str):
                    body = body[1:]
                key = ast.dump(ast.Module(body=body, type_ignores=[]), include_attributes=False)
                if len(key) >= 500:
                    groups[key].append({"file": file.relative_to(ROOT).as_posix(), "line": node.lineno, "name": node.name})
    return [{"kind": "python-function", "occurrences": rows} for rows in groups.values() if len(rows) > 1]


def frontend_candidates():
    groups = defaultdict(list)
    files = list((ROOT / "frontend/src").rglob("*"))
    files.extend((ROOT / "frontend/public/theme/pages").rglob("*.css"))
    for file in files:
        if file.suffix not in {".ts", ".tsx", ".css"} or ".test." in file.name or file.name.endswith(".d.ts"):
            continue
        lines = [(n, re.sub(r"\s+", " ", line.strip())) for n, line in enumerate(file.read_text(encoding="utf-8-sig").splitlines(), 1)]
        lines = [(n, line) for n, line in lines if line and not line.startswith(("import ", "//", "*"))]
        for index in range(max(0, len(lines) - 11)):
            window = lines[index:index + 12]
            key = "\n".join(line for _, line in window)
            if len(key) >= 350:
                groups[key].append({"file": file.relative_to(ROOT).as_posix(), "line": window[0][0]})
    candidates = [rows for rows in groups.values() if len({row["file"] for row in rows}) > 1]
    result = []
    covered = set()
    for rows in candidates:
        locations = {(row["file"], row["line"]) for row in rows}
        if locations.issubset(covered):
            continue
        result.append({"kind": "frontend-12-lines", "occurrences": rows})
        for file, line in locations:
            covered.update((file, n) for n in range(line, line + 12))
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--json", type=Path)
    parser.add_argument("--limit", type=int, default=25)
    args = parser.parse_args()
    result = backend_candidates() + frontend_candidates()
    if args.json:
        args.json.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"{len(result)} grupos candidatos; similaridade sintática exige revisão humana.")
    for group in result[:args.limit]:
        print(group["kind"])
        for row in group["occurrences"]:
            print(f"  {row['file']}:{row['line']} {row.get('name', '')}")


if __name__ == "__main__":
    main()
