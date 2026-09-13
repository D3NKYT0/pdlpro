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
    def test_skips_pip_when_requirements_are_unchanged(self):
        with tempfile.TemporaryDirectory(prefix='PDL setup test ') as directory:
            root = Path(directory)
            (root / 'scripts').mkdir()
            (root / 'backend').mkdir()
            (root / 'backend' / 'requirements.txt').write_text('example==1.0\n')
            script = root / 'scripts' / 'setup-python.bat'
            shutil.copyfile(Path(__file__).with_name('setup-python.bat'), script)
            shutil.copyfile(Path(__file__).with_name('file_stamp.py'), root / 'scripts' / 'file_stamp.py')
            (root / 'pip.py').write_text(
                'import json, os, sys\n'
                'with open(os.environ["PDL_TEST_LOG"], "a") as log:\n'
                '    log.write(json.dumps(sys.argv[1:]) + "\\n")\n'
                'stage = "check" if "check" in sys.argv else "requirements" if "-r" in sys.argv else "upgrade"\n'
                'sys.exit(1 if stage == os.environ.get("PDL_TEST_FAIL") else 0)\n'
            )
            log = root / 'calls.jsonl'
            env = {**os.environ, 'PYTHONPATH': str(root), 'PDL_TEST_LOG': str(log)}
            env.pop('PDL_FORCE_PIP', None)

            def run(failure='', extra=None):
                log.write_text('')
                merged = {**env, 'PDL_TEST_FAIL': failure}
                if extra:
                    merged.update(extra)
                result = subprocess.run(
                    [os.environ.get('COMSPEC', 'cmd.exe'), '/d', '/c', str(script)],
                    cwd=root.parent, env=merged,
                    capture_output=True, text=True, timeout=120,
                )
                calls = [json.loads(line) for line in log.read_text().splitlines()]
                return result, calls

            created = [
                ['install', '--upgrade', 'pip'],
                ['install', '-r', 'backend\\requirements.txt'],
                ['check'],
            ]
            synced = [
                ['install', '-r', 'backend\\requirements.txt'],
                ['check'],
            ]

            result, calls = run()
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            self.assertTrue((root / 'backend/.venv/Scripts/python.exe').exists())
            self.assertTrue((root / 'backend/.venv/.pdl-req.sha256').exists())
            self.assertEqual(calls, created)

            result, calls = run()
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            self.assertEqual(calls, [], 'Unchanged requirements must not call pip')
            self.assertIn('Pulando pip', result.stdout)

            (root / 'backend' / 'requirements.txt').write_text('example==2.0\n')
            result, calls = run()
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            self.assertEqual(calls, synced)

            result, calls = run(extra={'PDL_FORCE_PIP': '1'})
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            self.assertEqual(calls, synced)

            shutil.rmtree(root / 'backend' / '.venv')
            result, calls = run('upgrade')
            self.assertNotEqual(result.returncode, 0)
            self.assertEqual(calls, created[:1])
            self.assertIn('interrompida', result.stdout)

            result, calls = run()
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            self.assertEqual(calls, synced, 'venv ja criado nao precisa atualizar o pip de novo')

            (root / 'backend/.venv/.pdl-req.sha256').unlink()
            result, calls = run('requirements')
            self.assertNotEqual(result.returncode, 0)
            self.assertEqual(calls, synced[:1])
            self.assertIn('interrompida', result.stdout)

            result, calls = run('check')
            self.assertNotEqual(result.returncode, 0)
            self.assertEqual(calls, synced)
            self.assertIn('interrompida', result.stdout)


if __name__ == '__main__':
    unittest.main()
