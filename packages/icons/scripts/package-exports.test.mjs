import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repositoryRoot = resolve(packageRoot, '..', '..');

test('the package export map and build contain all canonical icon entry points', () => {
  execFileSync(process.execPath, [join(packageRoot, 'scripts', 'build.mjs')], {
    cwd: repositoryRoot,
    stdio: 'inherit',
  });

  const manifest = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'));
  const parity = JSON.parse(
    readFileSync(join(repositoryRoot, 'docs', 'design', 'design-system-parity.json'), 'utf8'),
  );
  const canonicalNames = parity.inventory
    .filter((entry) => entry.category === 'icon')
    .map((entry) => entry.figmaName);
  const sourceIndex = readFileSync(join(packageRoot, 'src', 'index.ts'), 'utf8');

  assert.equal(canonicalNames.length, 35);
  assert.deepEqual(Object.keys(manifest.exports), ['.', './package.json']);
  assert.deepEqual(Object.keys(manifest.dependencies ?? {}), []);
  assert.deepEqual(Object.keys(manifest.peerDependencies ?? {}), ['react']);
  for (const name of canonicalNames) {
    assert.match(sourceIndex, new RegExp(`export \\{ ${name} \\}`));
    for (const suffix of [`${name}.tsx`, `${name}.module.css`, `${name}.test.tsx`, 'index.ts']) {
      assert.equal(
        existsSync(join(packageRoot, 'src', 'icons', name, suffix)),
        true,
        `missing per-icon source contract for ${name}: ${suffix}`,
      );
    }
    for (const suffix of [`${name}.js`, `${name}.d.ts`, `${name}.module.css`]) {
      assert.equal(
        existsSync(join(packageRoot, 'dist', 'icons', name, suffix)),
        true,
        `missing packaged artifact for ${name}: ${suffix}`,
      );
    }
  }
  assert.equal(existsSync(join(packageRoot, 'dist', 'index.js')), true);
  assert.equal(existsSync(join(packageRoot, 'dist', 'index.d.ts')), true);
});
