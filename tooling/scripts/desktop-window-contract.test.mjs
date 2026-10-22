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
