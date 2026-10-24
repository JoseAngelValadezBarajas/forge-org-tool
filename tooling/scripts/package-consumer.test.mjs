import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '../..');
const packages = [
  ['@corefoundry-labs/forge-tokens', ['dist/tokens.css', 'dist/tokens.json']],
  ['@corefoundry-labs/forge-icons', ['dist/index.js', 'dist/index.d.ts']],
  ['@corefoundry-labs/forge-ui', ['dist/index.js', 'dist/index.d.ts', 'dist/styles.css']],
];

test('frontend installs published visual package artifacts', () => {
  for (const [name, files] of packages) {
    const packagePath = resolve(root, 'node_modules', ...name.split('/'));
    const manifest = JSON.parse(readFileSync(resolve(packagePath, 'package.json'), 'utf8'));
    assert.equal(manifest.name, name);
    assert.equal(manifest.version, '1.0.2');
    for (const file of files)
      assert.equal(existsSync(resolve(packagePath, file)), true, `${name}/${file}`);
  }
});

test('api-client remains local and private', () => {
  const manifest = JSON.parse(
    readFileSync(resolve(root, 'packages/api-client/package.json'), 'utf8'),
  );
  assert.equal(manifest.name, '@forge-org/api-client');
  assert.equal(manifest.private, true);
  assert.equal(existsSync(resolve(root, 'node_modules/@forge-org/api-client')), true);
});
