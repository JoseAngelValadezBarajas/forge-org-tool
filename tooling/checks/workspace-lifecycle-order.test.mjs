import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');

test('root postinstall builds only the local API workspace after install', () => {
  const rootPackage = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
  const workspaces = rootPackage.workspaces.map((workspace) => {
    const packagePath = resolve(root, workspace, 'package.json');
    return {
      ...JSON.parse(readFileSync(packagePath, 'utf8')),
    };
  });

  assert.equal(rootPackage.scripts.postinstall, 'npm run build:packages');
  assert.equal(
    rootPackage.scripts['build:packages'],
    'npm run build --workspace=@forge-org/api-client',
  );
  assert.deepEqual(rootPackage.workspaces, ['apps/web', 'packages/api-client']);
  for (const workspace of workspaces)
    assert.notEqual(
      workspace.scripts?.prepare,
      'npm run build',
      `${workspace.name} must not build in parallel during install`,
    );
});
