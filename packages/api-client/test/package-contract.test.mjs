import { strict as assert } from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

const packageRoot = resolve(import.meta.dirname, '..');

test('api-client exposes compiled ESM and declarations through its public export', () => {
  const packageJson = JSON.parse(readFileSync(resolve(packageRoot, 'package.json'), 'utf8'));

  assert.deepEqual(packageJson.exports['.'], {
    types: './dist/index.d.ts',
    import: './dist/index.js',
  });
  assert.deepEqual(packageJson.exports['./planning'], {
    types: './dist/planning.d.ts',
    import: './dist/planning.js',
  });
  assert.equal(packageJson.types, './dist/index.d.ts');
  assert.equal(existsSync(resolve(packageRoot, 'dist/index.js')), true);
  assert.equal(existsSync(resolve(packageRoot, 'dist/index.d.ts')), true);
});

test('compiled facade and capability subpath expose callable operations', async () => {
  const facade = await import(pathToFileURL(resolve(packageRoot, 'dist/index.js')));
  const planning = await import(pathToFileURL(resolve(packageRoot, 'dist/planning.js')));

  assert.equal(typeof facade.organizationApi.planningOverview, 'function');
  assert.equal(typeof planning.planningCapability.planningOverview, 'function');
});

test('compatibility facade exposes only active 1.0 capabilities', async () => {
  const { organizationApi } = await import(pathToFileURL(resolve(packageRoot, 'dist/index.js')));
  assert.equal(typeof organizationApi.listWorkspaces, 'function');
  assert.equal(typeof organizationApi.planningOverview, 'function');
  assert.equal(typeof organizationApi.previewProjectImport, 'function');
  assert.equal('listRunEvents' in organizationApi, false);
  assert.equal('listHandoffs' in organizationApi, false);
  assert.equal('listEvidence' in organizationApi, false);
  assert.equal('previewReadiness' in organizationApi, false);
  assert.equal('listRepositories' in organizationApi, false);
  assert.equal('listContextPackages' in organizationApi, false);
});
