import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

test('root package tooling has one dependency definition and concrete Rust targets', () => {
  const source = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');
  const packageJson = JSON.parse(source);
  const dependencyDefinitions = [...source.matchAll(/"devDependencies"\s*:/g)];

  assert.equal(dependencyDefinitions.length, 1);
  // Versions are owned by Dependabot and the lockfile; the contract is which tools exist.
  for (const tool of [
    '@eslint/js',
    'eslint',
    'eslint-config-prettier',
    'eslint-plugin-jsx-a11y',
    'eslint-plugin-react-hooks',
    'openapi-typescript',
    'prettier',
    'typescript',
    'typescript-eslint',
  ]) {
    assert.ok(tool in packageJson.devDependencies, `${tool} must stay a root devDependency`);
  }
  assert.match(
    packageJson.scripts['lint:fix'],
    /cargo fmt --manifest-path apps\/desktop\/Cargo\.toml/,
  );
  assert.match(
    packageJson.scripts['lint:fix'],
    /cargo fmt --manifest-path apps\/desktop\/src-tauri\/Cargo\.toml/,
  );
});
