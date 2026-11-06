import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { basename, join, relative, resolve, sep } from 'node:path';
import { randomUUID } from 'node:crypto';

const RUN_PREFIX = 'forge-product-acceptance-';
const MARKER_NAME = '.forge-product-acceptance-owner';
const MARKER_CONTENT = 'FORGE product acceptance fixture\n';

export function getRunEnvironmentPaths(runId = randomUUID()) {
  if (!/^[A-Za-z0-9-]{1,100}$/.test(runId)) {
    throw new Error('Playwright run ID contains unsupported path characters.');
  }
  const root = join(tmpdir(), `${RUN_PREFIX}${runId}`);
  return {
    root,
    fixtureDirectory: join(root, 'fixtures'),
    repositoryRoot: join(root, 'fixtures', 'synthetic-repository'),
    databasePath: join(root, 'forge-e2e.sqlite3'),
    markerPath: join(root, MARKER_NAME),
  };
}

export function createRunEnvironment(runId = randomUUID()) {
  const environment = getRunEnvironmentPaths(runId);
  mkdirSync(environment.root, { recursive: false });
  writeFileSync(environment.markerPath, MARKER_CONTENT, { flag: 'wx' });
  return environment;
}

export function assertOwnedRunEnvironment(environment) {
  const root = resolve(environment.root);
  const temporaryRoot = resolve(tmpdir());
  const relativeRoot = relative(temporaryRoot, root);
  if (
    !relativeRoot ||
    relativeRoot === '..' ||
    relativeRoot.startsWith(`..${sep}`) ||
    relativeRoot.includes(sep) ||
    basename(root).startsWith(RUN_PREFIX) === false
  ) {
    throw new Error(`Refusing to access an unexpected product acceptance temp directory: ${root}`);
  }
  if (
    resolve(environment.markerPath) !== join(root, MARKER_NAME) ||
    !existsSync(environment.markerPath) ||
    readFileSync(environment.markerPath, 'utf8') !== MARKER_CONTENT
  ) {
    throw new Error(`Refusing to access a fixture without the exact ownership marker: ${root}`);
  }
  return root;
}

export function cleanupRunEnvironment(environment) {
  const root = assertOwnedRunEnvironment(environment);
  rmSync(root, { recursive: true, force: false });
}

export async function allocatePort() {
  const server = createServer();
  await new Promise((resolveListen, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolveListen);
  });
  const address = server.address();
  if (!address || typeof address === 'string') {
    await new Promise((resolveClose) => server.close(resolveClose));
    throw new Error('Unable to allocate an isolated Playwright test port.');
  }
  const { port } = address;
  await new Promise((resolveClose, reject) =>
    server.close((error) => (error ? reject(error) : resolveClose())),
  );
  return port;
}

export async function assertPortAvailable(port) {
  const server = createServer();
  try {
    await new Promise((resolveListen, reject) => {
      server.once('error', reject);
      server.listen(port, '127.0.0.1', resolveListen);
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Playwright isolation failed: configured test port ${port} is occupied (${reason}).`,
    );
  }
  await new Promise((resolveClose, reject) =>
    server.close((error) => (error ? reject(error) : resolveClose())),
  );
}
