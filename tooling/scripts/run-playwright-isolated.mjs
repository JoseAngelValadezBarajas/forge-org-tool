import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { cleanupRunEnvironment, getRunEnvironmentPaths } from './e2e-environment.mjs';

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
const requireFromWeb = createRequire(join(repositoryRoot, 'apps', 'web', 'package.json'));
const playwrightCli = requireFromWeb.resolve('@playwright/test/cli');
const runId = process.env.FORGE_E2E_RUN_ID ?? randomUUID();
const runEnvironment = getRunEnvironmentPaths(runId);
const result = spawnSync(
  process.execPath,
  [playwrightCli, 'test', '--config', 'apps/web/playwright.config.ts', ...process.argv.slice(2)],
  {
    cwd: repositoryRoot,
    env: {
      ...process.env,
      FORGE_E2E_RUN_ID: runId,
      FORGE_E2E_DEFER_CLEANUP: '1',
    },
    stdio: 'inherit',
    shell: false,
  },
);

let cleanupError;
if (existsSync(runEnvironment.markerPath)) {
  try {
    cleanupRunEnvironment(runEnvironment);
  } catch (error) {
    cleanupError = error;
  }
}
if (result.error) throw result.error;
if (cleanupError) throw cleanupError;
process.exitCode = result.status ?? 1;
