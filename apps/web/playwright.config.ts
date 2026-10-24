import { defineConfig, devices } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  allocatePort,
  assertOwnedRunEnvironment,
  assertPortAvailable,
  getRunEnvironmentPaths,
} from '../../tooling/scripts/e2e-environment.mjs';

const webRoot = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(webRoot, '../..');
const apiRoot = join(repositoryRoot, 'apps', 'api');

function configuredPort(name: string): number | undefined {
  const raw = process.env[name];
  if (raw === undefined) return undefined;
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new Error(`${name} must be an integer between 1024 and 65535`);
  }
  return port;
}

const inheritedConfigToken = process.env.FORGE_E2E_CONFIG_RUN_TOKEN;
const configuredWebPort = configuredPort('FORGE_E2E_WEB_PORT');
const configuredApiPort = configuredPort('FORGE_E2E_API_PORT');
if (inheritedConfigToken && (configuredWebPort === undefined || configuredApiPort === undefined)) {
  throw new Error('Playwright worker did not inherit the isolated server ports from its runner.');
}
const webPort = configuredWebPort ?? (await allocatePort());
let apiPort = configuredApiPort ?? (await allocatePort());
if (apiPort === webPort && configuredApiPort === undefined) apiPort = await allocatePort();
if (webPort === apiPort) {
  throw new Error('Playwright isolation failed: web and API test ports must be different.');
}
if (!inheritedConfigToken) {
  await assertPortAvailable(webPort);
  await assertPortAvailable(apiPort);
  process.env.FORGE_E2E_WEB_PORT = String(webPort);
  process.env.FORGE_E2E_API_PORT = String(apiPort);
  process.env.FORGE_E2E_CONFIG_RUN_TOKEN = randomUUID();
} else {
  assertOwnedRunEnvironment(getRunEnvironmentPaths(process.env.FORGE_E2E_RUN_ID ?? ''));
}

const runId = process.env.FORGE_E2E_RUN_ID ?? randomUUID();
const runEnvironment = getRunEnvironmentPaths(runId);
const outputRoot = join(repositoryRoot, 'test-results', 'product-acceptance');
const runOutputDirectory = join(outputRoot, basename(runEnvironment.root));
const evidenceDirectory =
  process.env.FORGE_E2E_EVIDENCE_DIR ?? join(runOutputDirectory, 'evidence');
process.env.FORGE_E2E_RUN_ROOT = runEnvironment.root;
process.env.FORGE_E2E_RUN_ID = runId;
process.env.FORGE_E2E_FIXTURE_DIRECTORY = runEnvironment.fixtureDirectory;
process.env.FORGE_E2E_REPOSITORY_ROOT = runEnvironment.repositoryRoot;
process.env.FORGE_E2E_DATABASE_PATH = runEnvironment.databasePath;
process.env.FORGE_E2E_EVIDENCE_DIR = evidenceDirectory;

export default defineConfig({
  testDir: webRoot,
  testMatch: ['e2e/**/*.spec.ts', 'evidence/ux11-capture.spec.ts', '**/DetailPages.spec.ts'],
  outputDir: join(runOutputDirectory, 'playwright'),
  globalSetup: join(webRoot, 'e2e', 'global-setup.ts'),
  globalTeardown: join(webRoot, 'e2e', 'global-teardown.ts'),
  // All write-heavy journeys share one disposable SQLite database per run.
  workers: 1,
  reporter: [
    ['list'],
    [
      'json',
      {
        outputFile:
          process.env.FORGE_E2E_JSON_REPORT ?? join(runOutputDirectory, 'playwright-results.json'),
      },
    ],
  ],
  use: {
    baseURL: `http://127.0.0.1:${webPort}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: [
    {
      command: `npm run dev -- --host 127.0.0.1 --port ${webPort} --strictPort`,
      cwd: webRoot,
      url: `http://127.0.0.1:${webPort}`,
      reuseExistingServer: false,
      env: { FORGE_E2E_API_PORT: String(apiPort) },
    },
    {
      command: `uv run --project "${apiRoot}" uvicorn forge_org.main:app --host 127.0.0.1 --port ${apiPort}`,
      cwd: repositoryRoot,
      url: `http://127.0.0.1:${apiPort}/api/v1/health`,
      reuseExistingServer: false,
      env: {
        FORGE_E2E_API_PORT: String(apiPort),
        FORGE_DATABASE_PATH: runEnvironment.databasePath,
        FORGE_ALLOWED_REPOSITORY_ROOTS: JSON.stringify([runEnvironment.repositoryRoot]),
      },
    },
  ],
  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'chromium-mobile',
      use: {
        // Test the phone-width responsive layout without mobile viewport scaling.
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        hasTouch: true,
      },
    },
  ],
});
