import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertOwnedRunEnvironment,
  cleanupRunEnvironment,
  createRunEnvironment,
} from '../../../tooling/scripts/e2e-environment.mjs';

function currentRunEnvironment() {
  const root = process.env.FORGE_E2E_RUN_ROOT;
  if (!root) throw new Error('Playwright did not provide an isolated acceptance run directory.');
  return {
    root,
    fixtureDirectory: process.env.FORGE_E2E_FIXTURE_DIRECTORY ?? join(root, 'fixtures'),
    repositoryRoot:
      process.env.FORGE_E2E_REPOSITORY_ROOT ?? join(root, 'fixtures', 'synthetic-repository'),
    databasePath: process.env.FORGE_E2E_DATABASE_PATH ?? join(root, 'forge-e2e.sqlite3'),
    markerPath: join(root, '.forge-product-acceptance-owner'),
  };
}

export default async function globalSetup() {
  const runId = process.env.FORGE_E2E_RUN_ID;
  if (!runId) throw new Error('Playwright did not provide a unique acceptance run ID.');
  const run = createRunEnvironment(runId);
  const evidenceDirectory = process.env.FORGE_E2E_EVIDENCE_DIR;

  try {
    if (!evidenceDirectory) throw new Error('Playwright evidence directory was not configured.');
    const configured = currentRunEnvironment();
    if (
      configured.root !== run.root ||
      configured.fixtureDirectory !== run.fixtureDirectory ||
      configured.repositoryRoot !== run.repositoryRoot ||
      configured.databasePath !== run.databasePath
    ) {
      throw new Error('Playwright run paths do not match the unique temporary fixture.');
    }
    assertOwnedRunEnvironment(run);
    mkdirSync(run.repositoryRoot, { recursive: true });
    mkdirSync(evidenceDirectory, { recursive: true });
    const readmePath = join(run.repositoryRoot, 'README.md');
    if (!existsSync(join(run.repositoryRoot, '.git'))) {
      writeFileSync(readmePath, 'Synthetic metadata-only browser fixture.\n');
      execFileSync('git', ['init', '--quiet', '--initial-branch=main', run.repositoryRoot]);
      execFileSync('git', ['-C', run.repositoryRoot, 'config', 'user.name', 'FORGE E2E']);
      execFileSync('git', [
        '-C',
        run.repositoryRoot,
        'config',
        'user.email',
        'e2e@example.invalid',
      ]);
      execFileSync('git', ['-C', run.repositoryRoot, 'add', 'README.md']);
      execFileSync(
        'git',
        ['-C', run.repositoryRoot, 'commit', '--quiet', '-m', 'Synthetic fixture'],
        {
          env: {
            ...process.env,
            GIT_AUTHOR_DATE: '2026-01-01T00:00:00Z',
            GIT_COMMITTER_DATE: '2026-01-01T00:00:00Z',
          },
        },
      );
    } else if (!existsSync(readmePath)) {
      throw new Error(`Synthetic repository is missing its fixture file: ${run.repositoryRoot}`);
    }
    if (process.env.FORGE_E2E_EPIC_LEGACY_FIXTURE === '1') {
      const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
      execFileSync(
        'uv',
        [
          'run',
          '--project',
          join(repositoryRoot, 'apps', 'api'),
          'python',
          join(
            repositoryRoot,
            'apps',
            'api',
            'tests',
            'fixtures',
            'create_legacy_epic_database.py',
          ),
          configured.databasePath,
        ],
        { cwd: repositoryRoot, stdio: 'inherit' },
      );
    }
  } catch (error) {
    cleanupRunEnvironment(run);
    throw error;
  }
}
