import { defineConfig, devices } from '@playwright/test';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const e2eDatabasePath = join(tmpdir(), `forge-org-e2e-${process.pid}-${Date.now()}.db`);
const e2eTaskWorkspace = resolve(
  process.cwd(),
  '../..',
  '.superpowers/sdd/2026-10-22-ux-01-visual-interaction-parity',
);
const e2eRunDirectory = join(e2eTaskWorkspace, 'e2e-fixture');
const e2eRepositoryRoot = join(e2eRunDirectory, 'synthetic-repository');
const webPort = Number(process.env.FORGE_E2E_WEB_PORT ?? 5173);
const apiPort = Number(process.env.FORGE_E2E_API_PORT ?? 30000 + (process.pid % 30000));

for (const [name, port] of [
  ['FORGE_E2E_WEB_PORT', webPort],
  ['FORGE_E2E_API_PORT', apiPort],
] as const) {
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new Error(`${name} must be an integer between 1024 and 65535`);
  }
}

process.env.FORGE_E2E_REPOSITORY_ROOT = e2eRepositoryRoot;

export default defineConfig({
  testDir: './e2e',
  outputDir: '../../test-results/m1-browser',
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  // The API smoke uses one disposable SQLite database for the run; serialize
  // write-heavy journeys so browser evidence cannot race schema migration.
  workers: 1,
  use: {
    baseURL: `http://127.0.0.1:${webPort}`,
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: `npm run dev -- --host 127.0.0.1 --port ${webPort} --strictPort`,
      url: `http://127.0.0.1:${webPort}`,
      // Never attach to an unrelated process already listening on the test port.
      reuseExistingServer: false,
      env: { FORGE_E2E_API_PORT: String(apiPort) },
    },
    {
      command: `uv run --project ../../apps/api uvicorn forge_org.main:app --host 127.0.0.1 --port ${apiPort}`,
      url: `http://127.0.0.1:${apiPort}/api/v1/health`,
      // Give every run a disposable database so stale local state cannot affect assertions.
      reuseExistingServer: false,
      env: {
        FORGE_E2E_API_PORT: String(apiPort),
        FORGE_DATABASE_PATH: e2eDatabasePath,
        FORGE_ALLOWED_REPOSITORY_ROOTS: JSON.stringify([e2eRepositoryRoot]),
      },
    },
  ],
  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'chromium-mobile',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
