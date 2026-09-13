"""Checks for scripts/dev_tcp.py using a local ephemeral socket."""

from __future__ import annotations

import socket
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from dev_tcp import is_open, main


class DevTcpTests(unittest.TestCase):
    def test_reports_open_and_closed_ports(self):
        server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        server.bind(('127.0.0.1', 0))
        server.listen(8)
        port = server.getsockname()[1]
        try:
            self.assertTrue(is_open('127.0.0.1', port))
            self.assertEqual(main(['127.0.0.1', str(port)]), 0)
        finally:
            server.close()
        self.assertFalse(is_open('127.0.0.1', port))
        self.assertEqual(main(['127.0.0.1', str(port)]), 1)

    def test_rejects_bad_invocation(self):
        self.assertEqual(main([]), 2)
        self.assertEqual(main(['127.0.0.1', 'x']), 2)


if __name__ == '__main__':
    unittest.main()
