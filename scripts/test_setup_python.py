"""Windows integration checks for setup-python.bat; pip is the mocked boundary.

Run with backend/.venv/Scripts/python.exe scripts/test_setup_python.py.
"""
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest


class SetupPythonTests(unittest.TestCase):
    def test_creation_repeated_sync_and_failures(self):
        with tempfile.TemporaryDirectory(prefix='PDL setup test ') as directory:
            root = Path(directory)
            (root / 'scripts').mkdir()
            (root / 'backend').mkdir()
            (root / 'backend' / 'requirements.txt').write_text('example==1.0\n')
            script = root / 'scripts' / 'setup-python.bat'
            shutil.copyfile(Path(__file__).with_name('setup-python.bat'), script)
            (root / 'pip.py').write_text(
                'import json, os, sys\n'
                'with open(os.environ["PDL_TEST_LOG"], "a") as log:\n'
                '    log.write(json.dumps(sys.argv[1:]) + "\\n")\n'
                'stage = "check" if "check" in sys.argv else "requirements" if "-r" in sys.argv else "upgrade"\n'
                'sys.exit(1 if stage == os.environ.get("PDL_TEST_FAIL") else 0)\n'
            )
            log = root / 'calls.jsonl'
            env = {**os.environ, 'PYTHONPATH': str(root), 'PDL_TEST_LOG': str(log)}

            def run(failure=''):
                log.write_text('')
                result = subprocess.run(
                    [os.environ.get('COMSPEC', 'cmd.exe'), '/d', '/c', str(script)],
                    cwd=root.parent, env={**env, 'PDL_TEST_FAIL': failure},
                    capture_output=True, text=True, timeout=120,
                )
                calls = [json.loads(line) for line in log.read_text().splitlines()]
                return result, calls

            expected = [
                ['install', '--upgrade', 'pip'],
                ['install', '--upgrade', '-r', 'backend\\requirements.txt'],
                ['check'],
            ]
            result, calls = run()
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            self.assertTrue((root / 'backend/.venv/Scripts/python.exe').exists())
            self.assertEqual(calls, expected)
            result, calls = run()
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            self.assertEqual(calls, expected, 'Unchanged requirements must still be synchronized')
            for stage, count in [('upgrade', 1), ('requirements', 2), ('check', 3)]:
                with self.subTest(stage=stage):
                    result, calls = run(stage)
                    self.assertNotEqual(result.returncode, 0)
                    self.assertEqual(calls, expected[:count])
                    self.assertIn('interrompida', result.stdout)


if __name__ == '__main__':
    unittest.main()
