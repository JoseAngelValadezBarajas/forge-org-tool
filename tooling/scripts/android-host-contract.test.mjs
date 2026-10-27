import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

const root = new URL('../../', import.meta.url);

async function read(relativePath) {
  return readFile(new URL(relativePath, root), 'utf8');
}

describe('Android shell contract', () => {
  it('keeps Android configuration cloud-only and excludes the Desktop sidecar', async () => {
    const config = JSON.parse(await read('apps/desktop/src-tauri/tauri.android.conf.json'));
    assert.deepEqual(config.bundle.externalBin, []);
    assert.equal(config.bundle.targets, undefined);
    assert.match(config.build.devUrl, /10\.0\.2\.2:5173/);
    assert.doesNotMatch(config.app.security.csp, /127\.0\.0\.1/);
    assert.ok(config.bundle.android.minSdkVersion >= 24);
  });

  it('keeps the Desktop sidecar host out of Android builds', async () => {
    const source = await read('apps/desktop/src-tauri/src/main.rs');
    const transport = await read('apps/web/src/desktopTransport.ts');
    assert.match(source, /cfg\(not\(any\(target_os = "android", target_os = "ios"\)\)\)/);
    assert.match(source, /cfg\(any\(target_os = "android", target_os = "ios"\)\)/);
    assert.match(transport, /Local SQLite transport is unavailable on Android/);
  });
});
