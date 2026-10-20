import { defineConfig, devices } from '@playwright/test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const e2eDatabasePath = join(tmpdir(), `forge-org-e2e-${process.pid}-${Date.now()}.db`);

export default defineConfig({
  testDir: './e2e',
  outputDir: '../../test-results/m1-browser',
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'npm run dev -- --host 127.0.0.1',
      url: 'http://127.0.0.1:5173',
      // Never attach to an unrelated process already listening on the test port.
      reuseExistingServer: false,
    },
    {
      command: 'uv run --project ../../apps/api uvicorn forge_org.main:app --host 127.0.0.1 --port 8000',
      url: 'http://127.0.0.1:8000/api/v1/health',
      // Give every run a disposable database so stale local state cannot affect assertions.
      reuseExistingServer: false,
      env: {
        FORGE_DATABASE_PATH: e2eDatabasePath,
      },
    },
  ],
  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'chromium-mobile',
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, isMobile: true },
    },
  ],
});
