import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { assertReleaseMetadata, readReleaseMetadata } from './release-version.mjs';

const repoRoot = path.resolve(import.meta.dirname, '../..');

test('reads the Forge 0.1.3 preview version contract from all manifests', () => {
  const metadata = readReleaseMetadata(repoRoot);

  assert.deepEqual(metadata, {
    packageVersion: '0.1.3',
    packageLockVersion: '0.1.3',
    tauriVersion: '0.1.3',
    cargoVersion: '0.1.3',
    cargoLockVersion: '0.1.3',
  });
  assert.doesNotThrow(() =>
    assertReleaseMetadata(repoRoot, { version: '0.1.3', tag: 'v0.1.3-preview.1' }),
  );
});

test('rejects a mismatched version or release tag', () => {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-release-version-'));
  fs.mkdirSync(path.join(fixtureRoot, 'apps/desktop/src-tauri'), { recursive: true });
  fs.writeFileSync(path.join(fixtureRoot, 'package.json'), '{"version":"0.1.2"}\n');
  fs.writeFileSync(
    path.join(fixtureRoot, 'package-lock.json'),
    '{"name":"forge-org-tool","version":"0.1.2","lockfileVersion":3,"packages":{"":{"version":"0.1.2"}}}\n',
  );
  fs.writeFileSync(
    path.join(fixtureRoot, 'apps/desktop/src-tauri/tauri.conf.json'),
    '{"version":"0.1.2"}\n',
  );
  fs.writeFileSync(
    path.join(fixtureRoot, 'apps/desktop/src-tauri/Cargo.toml'),
    '[package]\nname = "forge-org-desktop"\nversion = "0.1.2"\n',
  );
  fs.writeFileSync(
    path.join(fixtureRoot, 'apps/desktop/src-tauri/Cargo.lock'),
    'version = 4\n\n[[package]]\nname = "forge-org-desktop"\nversion = "0.1.2"\n',
  );

  assert.throws(
    () => assertReleaseMetadata(fixtureRoot, { version: '0.1.3', tag: 'v0.1.3-preview.2' }),
    /version|tag/i,
  );
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
});
