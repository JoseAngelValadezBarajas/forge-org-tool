import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const config = JSON.parse(await readFile('apps/desktop/src-tauri/tauri.conf.json', 'utf8'));

test('Tauri declares a visible, usable main FORGE window explicitly', () => {
  const [main, ...others] = config.app.windows ?? [];

  assert.equal(others.length, 0, 'the host starts one primary application window');
  assert.equal(main?.label, 'main');
  assert.equal(main?.title, 'FORGE Org Tool');
  assert.equal(main?.width, 1200);
  assert.equal(main?.height, 800);
  assert.ok(main?.minWidth >= 900);
  assert.ok(main?.minHeight >= 600);
  assert.equal(main?.center, true);
  assert.equal(main?.visible, true);
});

test('Windows desktop host uses the single-instance activation plugin', async () => {
  const manifest = await readFile('apps/desktop/src-tauri/Cargo.toml', 'utf8');
  const host = await readFile('apps/desktop/src-tauri/src/main.rs', 'utf8');

  assert.match(manifest, /tauri-plugin-single-instance\s*=/);
  assert.match(host, /tauri_plugin_single_instance::init/);
  assert.match(host, /get_webview_window\("main"\)/);
  assert.match(host, /\.unminimize\(\)/);
  assert.match(host, /\.set_focus\(\)/);
});

test('Desktop screenshot picker uses the native dialog and grants only selected-file reads', async () => {
  const manifest = await readFile('apps/desktop/src-tauri/Cargo.toml', 'utf8');
  const host = await readFile('apps/desktop/src-tauri/src/main.rs', 'utf8');
  const capability = JSON.parse(
    await readFile('apps/desktop/src-tauri/capabilities/default.json', 'utf8'),
  );

  assert.match(manifest, /tauri-plugin-dialog\s*=/);
  assert.match(manifest, /tauri-plugin-fs\s*=/);
  assert.match(host, /\.plugin\(tauri_plugin_dialog::init\(\)\)/);
  assert.match(host, /\.plugin\(tauri_plugin_fs::init\(\)\)/);
  assert.ok(capability.permissions.includes('dialog:allow-open'));
  assert.ok(capability.permissions.includes('fs:allow-read-file'));
  assert.ok(!capability.permissions.some((permission) => permission.startsWith('fs:scope-')));
});

test('the packaged PyInstaller sidecar is launched as a killable process group', async () => {
  const host = await readFile('apps/desktop/src-tauri/src/main.rs', 'utf8');
  const launch = host.slice(host.indexOf('.sidecar("forge-sidecar")'), host.indexOf('.spawn()'));

  assert.match(launch, /\.set_process_group\(true\)/);
});

test('Desktop smoke waits for its owned sidecars and uploads the installer after failed smoke', async () => {
  const smoke = await readFile('tooling/scripts/desktop-nsis-smoke.ps1', 'utf8');
  const workflow = await readFile('.github/workflows/quality.yml', 'utf8');
  const cleanup = smoke.slice(smoke.lastIndexOf('\nfinally {'));

  assert.ok(
    cleanup.indexOf('$process.CloseMainWindow()') < cleanup.indexOf('Stop-Process -Id $process.Id'),
    'the restarted application gets a graceful shutdown before forced termination',
  );
  assert.match(
    cleanup,
    /\$ownedSidecarPids[\s\S]*\$installedSidecarIds[\s\S]*Sort-Object\s+-Unique/,
  );
  assert.match(
    cleanup,
    /Get-Process\s+-Name\s+'forge-sidecar'[\s\S]*?\$installRoot[\s\S]*?Sort-Object\s+-Unique/,
    'cleanup discovers sidecars from the unique install path even if UI startup failed before ownership capture',
  );
  assert.match(smoke, /\$sidecar\.Path\.StartsWith\(\$installRoot/);
  assert.match(smoke, /\$sidecar\.WaitForExit\(15000\)/);
  assert.match(
    smoke,
    /Remove-Item\s+-LiteralPath\s+\$resolvedTestRoot\s+-Recurse\s+-Force\s+-ErrorAction Stop/,
  );
  assert.match(
    workflow,
    /run: npm run test:desktop:acceptance\s+- uses: actions\/upload-artifact@v4\s+if: always\(\)/,
  );
});

test('installed Desktop acceptance preserves a Bug screenshot through restart', async () => {
  const smoke = await readFile('tooling/scripts/desktop-nsis-smoke.ps1', 'utf8');

  assert.match(smoke, /Add Bug screenshot/);
  assert.match(smoke, /Bug screenshot: \$bugAttachmentName/);
  assert.match(
    smoke,
    /Invoke-ForgeElement\s+\$root\s+\(\[System\.Windows\.Automation\.ControlType\]::Button\)\s+'Bug'/,
  );
  assert.match(smoke, /Choose-ForgeFile\s+\$root\s+'Add Bug screenshot'/);
  assert.match(
    smoke,
    /System\.Windows\.Automation\.ControlType\]::Image\)\s+"Bug screenshot: \$bugAttachmentName"/,
  );
});

test('Windows UI Automation matches the exact name before checking control type', async () => {
  const smoke = await readFile('tooling/scripts/desktop-nsis-smoke.ps1', 'utf8');
  const wait = smoke.slice(
    smoke.indexOf('function Wait-ForgeAutomationElement'),
    smoke.indexOf('function Wait-ForgeAutomationNamedElement'),
  );

  assert.match(wait, /Condition\]::TrueCondition/);
  assert.match(wait, /Current\.Name -eq \$name/);
  assert.match(wait, /Current\.ControlType\.Id -eq \$controlType\.Id/);
});

test('native screenshot picker handles Windows dialog combo boxes without weakening persistence checks', async () => {
  const smoke = await readFile('tooling/scripts/desktop-nsis-smoke.ps1', 'utf8');

  assert.match(smoke, /\$root\.FindAll\([\s\S]*TreeScope\]::Descendants/);
  assert.match(smoke, /Current\.Name -match '\(\?i\)\(open\|abrir/);
  assert.match(smoke, /SendWait\('\{ENTER\}'\)/);
  assert.match(smoke, /\$fileNameControl[\s\S]*nombre de archivo/);
  assert.match(smoke, /ControlType\]::ComboBox/);
  assert.match(smoke, /AutomationId.*1148|1148.*AutomationId/);
  assert.match(smoke, /FORGE_DESKTOP_SMOKE_FORCE_SENDKEYS_PICKER/);
  assert.match(smoke, /Clipboard\]::SetText\(\$filePath\)/);
  assert.match(smoke, /SendWait\('\^v'\)/);
  assert.match(smoke, /Clipboard\]::SetDataObject\(\$previousClipboard, \$true\)/);
  assert.doesNotMatch(smoke, /SendWait\(\$filePath\)|ASC 95/);
  assert.match(smoke, /SendWait\('\{ENTER\}'\)/);
  assert.match(smoke, /PASS installed UI -> authenticated API -> SQLite -> restart/);
});

test('native combobox selection does not collapse an already closed dropdown', async () => {
  const smoke = await readFile('tooling/scripts/desktop-nsis-smoke.ps1', 'utf8');

  assert.match(smoke, /ExpandCollapseState\]::Expanded[\s\S]*?\.Collapse\(\)/);
});

test('installed WebView UI Automation supports stateful accessible buttons', async () => {
  const smoke = await readFile('tooling/scripts/desktop-nsis-smoke.ps1', 'utf8');

  assert.match(smoke, /TryGetCurrentPattern\([\s\S]*?TogglePattern/);
  assert.match(smoke, /ToggleState\]::Off[\s\S]*?\.Toggle\(\)/);
  assert.match(smoke, /Unsupported UI Automation patterns for control/);
  assert.match(smoke, /Wait-ForgeAutomationNamedElement\s+\$root\s+\$buttonName/);
  assert.match(smoke, /ClassName -in @\('#32770', 'CabinetWClass'\)/);
  assert.match(smoke, /Top-level windows:/);
});

test('local installed-app acceptance prepares current frontend and Python sidecar artifacts', async () => {
  const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
  const command = packageJson.scripts['test:desktop:acceptance'];

  assert.match(command, /npm run build/);
  assert.match(command, /package_sidecar\.ps1/);
  assert.match(command, /desktop:build:nsis/);
});

test('Desktop acceptance can verify an explicitly supplied installer without changing its CI default', async () => {
  const smoke = await readFile('tooling/scripts/desktop-nsis-smoke.ps1', 'utf8');

  assert.match(smoke, /param\(\s*\[string\]\$InstallerPath\s*\)/);
  assert.match(smoke, /PSBoundParameters\.ContainsKey\('InstallerPath'\)/);
  assert.match(smoke, /bundle[\\/]nsis/);
});

test('Desktop acceptance captures the live Bug detail surface when the native picker is missing', async () => {
  const smoke = await readFile('tooling/scripts/desktop-nsis-smoke.ps1', 'utf8');

  assert.match(smoke, /Native picker failure UIA elements/);
  assert.match(smoke, /CaptureWindow\(\$root\.Current\.NativeWindowHandle, \$screenshotPath\)/);
});
