import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
VERSION_FILE = ROOT / "version.json"


def read_version() -> str:
    """Retorna a versão da API; a imagem publicada a recebe durante o build."""
    if deployed_version := os.environ.get("PDL_API_VERSION", "").strip():
        return deployed_version
    try:
        import json

        data = json.loads(VERSION_FILE.read_text(encoding="utf-8"))
        return str(data.get("api_version") or data.get("version") or "1.0.0")
    except (OSError, ValueError, TypeError, KeyError):
        return "1.0.0"


API_VERSION = read_version()
