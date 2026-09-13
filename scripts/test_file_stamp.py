"""Checks for scripts/file_stamp.py."""

from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from file_stamp import digest, is_current, main, write_stamp


class FileStampTests(unittest.TestCase):
    def test_check_and_write_follow_file_changes(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / 'requirements.txt'
            stamp = root / 'venv' / 'req.sha256'
            source.write_text('example==1.0\n', encoding='ascii')
            self.assertFalse(is_current(source, stamp))
            self.assertEqual(main(['check', str(source), str(stamp)]), 1)
            self.assertEqual(main(['write', str(source), str(stamp)]), 0)
            self.assertTrue(stamp.is_file())
            self.assertEqual(stamp.read_text(encoding='ascii'), digest(source))
            self.assertTrue(is_current(source, stamp))
            self.assertEqual(main(['check', str(source), str(stamp)]), 0)
            source.write_text('example==2.0\n', encoding='ascii')
            self.assertFalse(is_current(source, stamp))
            self.assertEqual(main(['check', str(source), str(stamp)]), 1)
            write_stamp(source, stamp)
            self.assertTrue(is_current(source, stamp))

    def test_rejects_bad_invocation(self):
        self.assertEqual(main([]), 2)
        self.assertEqual(main(['check', 'missing.txt', 'stamp']), 2)


if __name__ == '__main__':
    unittest.main()
