"""List outdated packages that appear as direct pins in requirements.txt."""
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REQ = ROOT / "requirements.txt"


def main() -> int:
    reqs: set[str] = set()
    for line in REQ.read_text(encoding="utf-8").splitlines():
        m = re.match(r"([A-Za-z0-9_.\-]+)==", line.strip())
        if m:
            reqs.add(m.group(1).lower().replace("_", "-"))

    out = subprocess.check_output(
        [sys.executable, "-m", "pip", "list", "--outdated", "--format=json"],
        text=True,
    )
    for pkg in json.loads(out):
        name = pkg["name"].lower().replace("_", "-")
        if name in reqs:
            print(f"{pkg['name']}: {pkg['version']} -> {pkg['latest_version']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
