"""Probe TCP reachability for the Windows start scripts."""

from __future__ import annotations

import socket
import sys


def is_open(host: str, port: int, timeout: float = 0.35) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


def main(argv: list[str] | None = None) -> int:
    args = sys.argv[1:] if argv is None else argv
    if len(args) != 2:
        print('Uso: dev_tcp.py HOST PORT', file=sys.stderr)
        return 2
    try:
        port = int(args[1])
    except ValueError:
        print('PORTA invalida.', file=sys.stderr)
        return 2
    return 0 if is_open(args[0], port) else 1


if __name__ == '__main__':
    raise SystemExit(main())
