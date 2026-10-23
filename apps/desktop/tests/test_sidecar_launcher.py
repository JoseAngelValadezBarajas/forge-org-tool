import os
import sys
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).parents[1]))
from sidecar_launcher import app_data_root, backup_database, local_paths, start_sidecar  # noqa: E402


class SidecarLauncherTests(unittest.TestCase):
    def test_paths_are_isolated_under_local_app_data(self) -> None:
        with patch.dict(os.environ, {'LOCALAPPDATA': r'C:\Users\test\AppData\Local'}, clear=False):
            database, log = local_paths()
        self.assertEqual(database, Path(r'C:\Users\test\AppData\Local\ForgeOrgTool\data\forge.db'))
        self.assertEqual(log, Path(r'C:\Users\test\AppData\Local\ForgeOrgTool\logs\sidecar.log'))

    def test_missing_local_app_data_is_rejected(self) -> None:
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaisesRegex(RuntimeError, 'LOCALAPPDATA'):
                app_data_root()

    def test_existing_database_is_backed_up_under_the_same_app_root(self) -> None:
        with self.subTest('backup'):
            with TemporaryDirectory() as temporary_root:
                with patch.dict(os.environ, {'LOCALAPPDATA': temporary_root}, clear=False):
                    database = app_data_root() / 'data' / 'forge.db'
                    database.parent.mkdir(parents=True, exist_ok=True)
                    database.write_bytes(b'forge-db')
                    backup = backup_database(database)
                    self.assertIsNotNone(backup)
                    self.assertEqual(backup.read_bytes(), b'forge-db')
                    self.assertEqual(backup.parent, app_data_root() / 'backups')

    def test_start_rejects_a_sidecar_that_exits_immediately(self) -> None:
        with TemporaryDirectory() as temporary_root:
            with patch.dict(os.environ, {'LOCALAPPDATA': temporary_root}, clear=False):
                with patch('sidecar_launcher.free_loopback_port', return_value=43123), patch('sidecar_launcher.secrets.token_urlsafe', return_value='a' * 32), patch('sidecar_launcher.subprocess.Popen') as popen:
                    popen.return_value.poll.return_value = 17
                    with self.assertRaisesRegex(RuntimeError, 'Sidecar exited before the sidecar became ready'):
                        start_sidecar()

    def test_packaged_command_does_not_put_token_in_arguments(self) -> None:
        from sidecar_launcher import sidecar_command

        with patch.dict(
            os.environ,
            {'FORGE_SIDECAR_COMMAND': '["C:\\\\Forge\\\\forge-sidecar.exe"]'},
            clear=False,
        ):
            command = sidecar_command(43123)

        self.assertEqual(command, ['C:\\Forge\\forge-sidecar.exe', '--port', '43123'])
        self.assertNotIn('FORGE_SIDECAR_TOKEN', ' '.join(command))

    def test_start_waits_for_authenticated_health_readiness(self) -> None:
        with TemporaryDirectory() as temporary_root:
            with patch.dict(os.environ, {'LOCALAPPDATA': temporary_root}, clear=False):
                with patch('sidecar_launcher.free_loopback_port', return_value=43123), patch(
                    'sidecar_launcher.secrets.token_urlsafe', return_value='a' * 32
                ), patch('sidecar_launcher.subprocess.Popen') as popen, patch(
                    'sidecar_launcher.wait_for_readiness'
                ) as wait_for_readiness:
                    popen.return_value.poll.return_value = None
                    session = start_sidecar()

        wait_for_readiness.assert_called_once_with(43123, 'a' * 32)
        self.assertEqual(session.base_url, 'http://127.0.0.1:43123')


if __name__ == '__main__':
    unittest.main()
