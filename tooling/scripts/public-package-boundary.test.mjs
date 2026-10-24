import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { assertPublicPackageBoundary, PUBLIC_PACKAGE_NAMES, LOCAL_PACKAGE_NAMES, readPackageManifest } from './public-package-boundary.mjs';

const root = resolve(import.meta.dirname, '../..');
const rootPackage = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const manifests = Object.fromEntries([...PUBLIC_PACKAGE_NAMES, ...LOCAL_PACKAGE_NAMES].map((name) => [name, readPackageManifest(root, name)]));

test('keeps only api-client local in the application workspace', () => {
  assert.doesNotThrow(() => assertPublicPackageBoundary(rootPackage, manifests));
});

test('visual packages have publishable package manifests outside the app workspace', () => {
  for (const name of PUBLIC_PACKAGE_NAMES) {
    const manifest = manifests[name];
    assert.equal(manifest.private, false, `${name} must be publishable`);
    assert.match(manifest.version, /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/);
  }
});
