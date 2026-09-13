"""Compare or persist a SHA-256 stamp for a file (requirements, lockfile)."""

from __future__ import annotations

import hashlib
import sys
from pathlib import Path


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def is_current(path: Path, stamp: Path) -> bool:
    if not path.is_file() or not stamp.is_file():
        return False
    return stamp.read_text(encoding='ascii').strip() == digest(path)


def write_stamp(path: Path, stamp: Path) -> None:
    stamp.parent.mkdir(parents=True, exist_ok=True)
    stamp.write_text(digest(path), encoding='ascii')


def main(argv: list[str] | None = None) -> int:
    args = sys.argv[1:] if argv is None else argv
    if len(args) != 3 or args[0] not in {'check', 'write'}:
        print('Uso: file_stamp.py check|write ARQUIVO STAMP', file=sys.stderr)
        return 2
    path = Path(args[1])
    stamp = Path(args[2])
    if not path.is_file():
        print(f'Arquivo nao encontrado: {path}', file=sys.stderr)
        return 2
    if args[0] == 'write':
        write_stamp(path, stamp)
        return 0
    return 0 if is_current(path, stamp) else 1


if __name__ == '__main__':
    raise SystemExit(main())
