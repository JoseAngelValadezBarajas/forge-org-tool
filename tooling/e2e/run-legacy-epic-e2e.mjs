import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
const result = spawnSync(
  process.execPath,
  [
    join(repositoryRoot, 'tooling', 'scripts', 'run-playwright-isolated.mjs'),
    '--config',
    'apps/web/playwright.config.ts',
    '--grep',
    '@legacy-epic',
    '--project=chromium-desktop',
  ],
  {
    cwd: repositoryRoot,
    env: { ...process.env, FORGE_E2E_EPIC_LEGACY_FIXTURE: '1' },
    stdio: 'inherit',
    shell: false,
  },
);

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
