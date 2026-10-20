import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).parents[1]))
from sidecar_launcher import app_data_root, local_paths  # noqa: E402


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


if __name__ == '__main__':
    unittest.main()
