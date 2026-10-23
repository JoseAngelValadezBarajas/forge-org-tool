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

test('workbench event facade preserves generated API paths and request bodies', async () => {
  const { organizationApi } = await import(pathToFileURL(resolve(packageRoot, 'dist/index.js')));
  const calls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    calls.push({ input: String(input), init });
    return new globalThis.Response(JSON.stringify({ id: 'event-1' }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  try {
    assert.equal(typeof organizationApi.listRunEvents, 'function');
    assert.equal(typeof organizationApi.createRunEvent, 'function');
    await organizationApi.listRunEvents('workspace-1', 'project-1', 'run-1');
    await organizationApi.createRunEvent('workspace-1', 'project-1', 'run-1', {
      event_type: 'NOTE',
      title: 'Human reported update',
      expected_version: 3,
    });

    assert.equal(
      calls[0].input,
      '/api/v1/workspaces/workspace-1/projects/project-1/runs/run-1/events',
    );
    assert.equal(calls[0].init.credentials, 'same-origin');
    assert.equal(
      calls[1].input,
      '/api/v1/workspaces/workspace-1/projects/project-1/runs/run-1/events',
    );
    assert.equal(calls[1].init.method, 'POST');
    assert.deepEqual(JSON.parse(calls[1].init.body), {
      event_type: 'NOTE',
      title: 'Human reported update',
      expected_version: 3,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
