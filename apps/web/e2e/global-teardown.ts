import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';

export default async function globalTeardown() {
  const taskRoot = resolve(
    process.cwd(),
    '../..',
    '.superpowers/sdd/2026-10-22-ux-01-visual-interaction-parity',
  );
  const runRoot = join(taskRoot, 'e2e-fixture');
  const markerPath = join(runRoot, 'FORGE-UX01-SYNTHETIC');
  if (
    !runRoot.startsWith(`${taskRoot}${sep}`) ||
    !existsSync(markerPath) ||
    readFileSync(markerPath, 'utf8') !== 'Synthetic browser fixture only.\n'
  ) {
    throw new Error(`Refusing to remove unexpected UX-01 browser fixture path: ${runRoot}`);
  }
  rmSync(runRoot, { recursive: true, force: true });
}
