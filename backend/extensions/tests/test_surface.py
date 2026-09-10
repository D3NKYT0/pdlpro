"""Testes da superfície pública e limites de import das extensões."""

from __future__ import annotations

import ast
from pathlib import Path

from extensions import surface


def test_surface_exports_di_and_views():
    assert surface.InjectedAPIView is not None
    assert surface.AppProvider is not None
    assert surface.DomainError is not None
    assert "PermissionDeniedError" not in surface.__all__


def test_extension_packages_do_not_import_core_infrastructure():
    """Extensões não podem importar apps.*.infrastructure (use portas + DI)."""

    root = Path(__file__).resolve().parents[1]
    violations: list[str] = []

    for path in root.rglob("*.py"):
        if "tests" in path.parts:
            continue
        source = path.read_text(encoding="utf-8")
        tree = ast.parse(source, filename=str(path))
        for node in ast.walk(tree):
            module = None
            if isinstance(node, ast.ImportFrom) and node.module:
                module = node.module
            elif isinstance(node, ast.Import):
                for alias in node.names:
                    module = alias.name
                    if _is_forbidden_infra(module):
                        violations.append(f"{path}:{node.lineno}: import {module}")
                continue
            if module and _is_forbidden_infra(module):
                violations.append(f"{path}:{node.lineno}: from {module}")

    assert violations == []


def _is_forbidden_infra(module: str) -> bool:
    if not module.startswith("apps."):
        return False
    parts = module.split(".")
    return len(parts) >= 3 and parts[2] == "infrastructure"
