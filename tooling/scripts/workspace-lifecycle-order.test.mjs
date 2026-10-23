import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');

test('root postinstall builds workspace packages sequentially after install', () => {
  const rootPackage = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
  const workspaces = rootPackage.workspaces.map((workspace) => {
    const packagePath = resolve(root, workspace, 'package.json');
    return {
      ...JSON.parse(readFileSync(packagePath, 'utf8')),
    };
  });

  assert.equal(rootPackage.scripts.postinstall, 'npm run build:packages');
  assert.ok(
    rootPackage.scripts['build:packages'].indexOf('@forge-org/icons') <
      rootPackage.scripts['build:packages'].indexOf('@forge-org/ui'),
  );
  assert.ok(
    rootPackage.scripts['build:packages'].indexOf('@forge-org/tokens') <
      rootPackage.scripts['build:packages'].indexOf('@forge-org/ui'),
  );
  for (const workspace of workspaces)
    assert.notEqual(
      workspace.scripts?.prepare,
      'npm run build',
      `${workspace.name} must not build in parallel during install`,
    );
});
