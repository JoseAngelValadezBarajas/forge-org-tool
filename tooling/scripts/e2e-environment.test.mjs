import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  allocatePort,
  assertPortAvailable,
  cleanupRunEnvironment,
  createRunEnvironment,
  getRunEnvironmentPaths,
} from './e2e-environment.mjs';

test('resolves isolated paths without creating directories during Playwright config discovery', async () => {
  const paths = getRunEnvironmentPaths('config-discovery-test');
  assert.match(paths.root, new RegExp(`^${tmpdir().replaceAll('\\', '\\\\')}`));
  await assert.rejects(readFile(paths.markerPath), { code: 'ENOENT' });
});

test('creates a uniquely owned run-scoped fixture under the OS temporary directory', async () => {
  const first = createRunEnvironment();
  const second = createRunEnvironment();
  try {
    assert.notEqual(first.root, second.root);
    assert.equal(first.fixtureDirectory, join(first.root, 'fixtures'));
    assert.equal(first.repositoryRoot, join(first.fixtureDirectory, 'synthetic-repository'));
    assert.equal(first.databasePath, join(first.root, 'forge-e2e.sqlite3'));
    assert.match(first.root, new RegExp(`^${tmpdir().replaceAll('\\', '\\\\')}`));
    assert.equal(await readFile(first.markerPath, 'utf8'), 'FORGE product acceptance fixture\n');
  } finally {
    cleanupRunEnvironment(first);
    cleanupRunEnvironment(second);
  }
});

test('refuses to clean a temporary directory without the exact ownership marker', async () => {
  const root = await mkdtemp(join(tmpdir(), 'forge-product-acceptance-unowned-'));
  const protectedFile = join(root, 'keep.txt');
  await writeFile(protectedFile, 'operator data');
  try {
    assert.throws(
      () => cleanupRunEnvironment({ root, markerPath: join(root, '.forge-acceptance-owner') }),
      /ownership marker/i,
    );
    assert.equal(await readFile(protectedFile, 'utf8'), 'operator data');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('allocates an available loopback port and rejects an occupied one', async () => {
  const port = await allocatePort();
  await assertPortAvailable(port);

  const listener = createServer();
  await new Promise((resolve, reject) => {
    listener.once('error', reject);
    listener.listen(0, '127.0.0.1', resolve);
  });
  const address = listener.address();
  assert.ok(address && typeof address === 'object');
  try {
    await assert.rejects(assertPortAvailable(address.port), /occupied/i);
  } finally {
    await new Promise((resolve, reject) =>
      listener.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
