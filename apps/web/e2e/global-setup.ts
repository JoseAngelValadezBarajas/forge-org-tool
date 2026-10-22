import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';

export default async function globalSetup() {
  const taskRoot = resolve(
    process.cwd(),
    '../..',
    '.superpowers/sdd/2026-10-22-ux-01-visual-interaction-parity',
  );
  const fixtureRoot = join(taskRoot, 'e2e-fixture');
  const markerPath = join(fixtureRoot, 'FORGE-UX01-SYNTHETIC');
  const repositoryRoot = join(fixtureRoot, 'synthetic-repository');
  if (!fixtureRoot.startsWith(`${taskRoot}${sep}`)) {
    throw new Error(`Refusing to initialize an unexpected UX-01 fixture path: ${fixtureRoot}`);
  }
  if (
    existsSync(markerPath) &&
    readFileSync(markerPath, 'utf8') !== 'Synthetic browser fixture only.\n'
  ) {
    throw new Error(`Refusing to reuse an unrecognized UX-01 fixture: ${fixtureRoot}`);
  }
  if (existsSync(fixtureRoot) && !existsSync(markerPath)) {
    throw new Error(`UX-01 browser fixture exists without its ownership marker: ${fixtureRoot}`);
  }

  try {
    mkdirSync(repositoryRoot, { recursive: true });
    writeFileSync(markerPath, 'Synthetic browser fixture only.\n');
    const readmePath = join(repositoryRoot, 'README.md');
    if (!existsSync(join(repositoryRoot, '.git'))) {
      writeFileSync(readmePath, 'Synthetic metadata-only browser fixture.\n');
      execFileSync('git', ['init', '--quiet', '--initial-branch=main', repositoryRoot]);
      execFileSync('git', ['-C', repositoryRoot, 'config', 'user.name', 'FORGE UX E2E']);
      execFileSync('git', ['-C', repositoryRoot, 'config', 'user.email', 'ux-e2e@example.invalid']);
      execFileSync('git', ['-C', repositoryRoot, 'add', 'README.md']);
      execFileSync('git', ['-C', repositoryRoot, 'commit', '--quiet', '-m', 'Synthetic fixture'], {
        env: {
          ...process.env,
          GIT_AUTHOR_DATE: '2026-01-01T00:00:00Z',
          GIT_COMMITTER_DATE: '2026-01-01T00:00:00Z',
        },
      });
    } else if (!existsSync(readmePath)) {
      throw new Error(`Synthetic repository is missing its fixture file: ${readmePath}`);
    }
  } catch (error) {
    rmSync(fixtureRoot, { recursive: true, force: true });
    throw error;
  }
}
