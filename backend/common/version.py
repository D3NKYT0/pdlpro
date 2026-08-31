from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
VERSION_FILE = ROOT / "version.json"


def read_version() -> str:
    try:
        import json

        data = json.loads(VERSION_FILE.read_text(encoding="utf-8"))
        return str(data.get("api_version") or data.get("version") or "1.0.0")
    except Exception:
        return "1.0.0"


API_VERSION = read_version()
