import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const captureDirectory = resolve(root, 'docs/evidence/ux-1.1/visual-parity/actual');
const runner = resolve(root, 'tooling/scripts/run-playwright-isolated.mjs');
for (const project of ['chromium-desktop', 'chromium-mobile']) {
  const capture = spawnSync(
    process.execPath,
    [runner, `--project=${project}`, 'apps/web/evidence/ux11-capture.spec.ts'],
    {
      cwd: root,
      env: { ...process.env, FORGE_UX11_CAPTURE_DIR: captureDirectory },
      stdio: 'inherit',
      shell: false,
    },
  );
  if (capture.error) throw capture.error;
  if (capture.status !== 0) process.exit(capture.status ?? 1);
}

const compare = spawnSync(
  process.execPath,
  [resolve(root, 'tooling/scripts/compare-ux11-evidence.mjs')],
  {
    cwd: root,
    stdio: 'inherit',
    shell: false,
  },
);
if (compare.error) throw compare.error;
process.exitCode = compare.status ?? 1;
