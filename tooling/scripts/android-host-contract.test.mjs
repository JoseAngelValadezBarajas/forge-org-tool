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
    const library = await read('apps/desktop/src-tauri/src/lib.rs');
    const transport = await read('apps/web/src/desktopTransport.ts');
    assert.match(source, /forge_org_desktop_lib::run\(\)/);
    assert.match(library, /#\[cfg_attr\(mobile, tauri::mobile_entry_point\)\]/);
    assert.match(library, /cfg\(not\(any\(target_os = "android", target_os = "ios"\)\)\)/);
    assert.match(library, /cfg\(any\(target_os = "android", target_os = "ios"\)/);
    assert.match(transport, /Local SQLite transport is unavailable on Android/);
  });

  it('declares the shared mobile library target and excludes mobile sidecars', async () => {
    const cargo = await read('apps/desktop/src-tauri/Cargo.toml');
    assert.match(
      cargo,
      /\[lib\][\s\S]*name = "forge_org_desktop_lib"[\s\S]*crate-type = \["staticlib", "cdylib", "rlib"\]/,
    );
    const desktopDependencies = cargo.match(
      /\[target\.'cfg\(not\(any\(target_os = "android", target_os = "ios"\)\)\)'\.dependencies\][\s\S]*?(?=\n\[|$)/,
    )?.[0];
    const baseDependencies = cargo.match(/\[dependencies\][\s\S]*?(?=\n\[|$)/)?.[0];
    assert.ok(desktopDependencies);
    assert.ok(baseDependencies);
    assert.match(desktopDependencies, /tauri-plugin-shell = "2\.0\.0"/);
    assert.doesNotMatch(baseDependencies, /tauri-plugin-shell/);
    const capability = JSON.parse(await read('apps/desktop/src-tauri/capabilities/default.json'));
    assert.deepEqual(capability.platforms, ['windows', 'macOS', 'linux']);
  });

  it('defines a CI lane that builds and uploads a real debug APK', async () => {
    const workflow = await read('.github/workflows/android-debug.yml');
    const packageJson = JSON.parse(await read('package.json'));
    assert.match(workflow, /runs-on: ubuntu-24\.04/);
    assert.match(workflow, /actions\/setup-java@v4/);
    assert.match(workflow, /node-version: ['"]24['"]/);
    assert.match(workflow, /android-actions\/setup-android@v3/);
    assert.match(workflow, /packages: platform-tools/);
    assert.match(workflow, /NDK_HOME=\$ANDROID_HOME\/ndk\/27\.2\.12479018/);
    assert.match(workflow, /npx tauri android init --ci/);
    assert.match(workflow, /npx tauri android build --debug --apk/);
    assert.match(workflow, /actions\/upload-artifact@v4/);
    assert.match(workflow, /10\\\.0\\\.2\\\.2|127\\\.0\\\.0\\\.1:5173/);
    assert.equal(packageJson.scripts.tauri, 'tauri');
  });
});
