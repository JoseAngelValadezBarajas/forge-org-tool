import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

test('root package tooling has one dependency definition and concrete Rust targets', () => {
  const source = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');
  const packageJson = JSON.parse(source);
  const dependencyDefinitions = [...source.matchAll(/"devDependencies"\s*:/g)];

  assert.equal(dependencyDefinitions.length, 1);
  assert.deepEqual(packageJson.devDependencies, {
    '@eslint/js': '^9.39.5',
    eslint: '^9.39.5',
    'eslint-config-prettier': '^10.1.8',
    'eslint-plugin-jsx-a11y': '^6.10.2',
    'eslint-plugin-react-hooks': '^7.1.1',
    prettier: '^3.9.10',
    'typescript-eslint': '^8.72.0',
  });
  assert.match(
    packageJson.scripts['lint:fix'],
    /cargo fmt --manifest-path apps\/desktop\/Cargo\.toml/,
  );
  assert.match(
    packageJson.scripts['lint:fix'],
    /cargo fmt --manifest-path apps\/desktop\/src-tauri\/Cargo\.toml/,
  );
});
